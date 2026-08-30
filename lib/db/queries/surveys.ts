import { and, count, desc, eq, inArray, max } from 'drizzle-orm';
import { db } from '../client';
import { answers, questionOptions, questions, surveyResponses, surveys } from '../schema';
import { DomainError } from '@/lib/domain/shared/errors';
import { randomSlug } from '@/lib/domain/shared/slug';
import { reconcileOptions } from '@/lib/domain/surveys/reconcile';
import { assertValidRatingConfig } from '@/lib/domain/surveys/rating';
import type { AnswerRow } from '@/lib/domain/surveys/respond';
import { computeTally, type QuestionResult } from '@/lib/domain/surveys/tally';
import type { QuestionInput, QuestionWithOptions, RatingConfig, StoredOption } from '@/lib/domain/surveys/types';

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === UNIQUE_VIOLATION;
}

export async function createSurvey(input: { title: string; description?: string }): Promise<{ id: string }> {
  const [row] = await db
    .insert(surveys)
    .values({ title: input.title, description: input.description })
    .returning({ id: surveys.id });
  return { id: row.id };
}

export async function listSurveys(): Promise<(typeof surveys.$inferSelect)[]> {
  return db.select().from(surveys).orderBy(desc(surveys.createdAt));
}

export async function countResponses(surveyId: string): Promise<number> {
  const [{ responseCount }] = await db
    .select({ responseCount: count() })
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, surveyId));
  return responseCount;
}

export async function loadQuestionsWithOptions(surveyId: string): Promise<QuestionWithOptions[]> {
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(questions.position);

  const optionRows = questionRows.length
    ? await db
        .select()
        .from(questionOptions)
        .where(
          inArray(
            questionOptions.questionId,
            questionRows.map((q) => q.id),
          ),
        )
        .orderBy(questionOptions.position)
    : [];

  const optionsByQuestion = new Map<string, StoredOption[]>();
  for (const opt of optionRows) {
    const list = optionsByQuestion.get(opt.questionId) ?? [];
    list.push({ id: opt.id, position: opt.position, label: opt.label });
    optionsByQuestion.set(opt.questionId, list);
  }

  return questionRows.map((q) => ({
    id: q.id,
    position: q.position,
    prompt: q.prompt,
    required: q.required,
    type: q.type,
    config: q.config as RatingConfig | null,
    options: optionsByQuestion.get(q.id) ?? [],
  }));
}

export async function getSurveyWithQuestions(
  id: string,
): Promise<{ survey: typeof surveys.$inferSelect; questions: QuestionWithOptions[] } | null> {
  const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
  if (!survey) return null;

  const withOptions = await loadQuestionsWithOptions(id);

  return { survey, questions: withOptions };
}

export async function patchSurvey(
  id: string,
  patch: { title?: string; description?: string; showResultsToRespondents?: boolean },
): Promise<void> {
  const result = await db
    .update(surveys)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(surveys.id, id))
    .returning({ id: surveys.id });
  if (result.length === 0) throw new DomainError('NOT_FOUND');
}

export async function deleteSurvey(id: string): Promise<void> {
  const result = await db.delete(surveys).where(eq(surveys.id, id)).returning({ id: surveys.id });
  if (result.length === 0) throw new DomainError('NOT_FOUND');
}

export async function addQuestion(surveyId: string, q: QuestionInput): Promise<{ id: string }> {
  if (q.type === 'rating') assertValidRatingConfig(q.config);
  return db.transaction(async (tx) => {
    const [survey] = await tx.select({ status: surveys.status }).from(surveys).where(eq(surveys.id, surveyId));
    if (!survey) throw new DomainError('NOT_FOUND');
    if (survey.status !== 'draft') throw new DomainError('QUESTIONS_FROZEN', 'survey is not a draft');

    const [{ maxPosition }] = await tx
      .select({ maxPosition: max(questions.position) })
      .from(questions)
      .where(eq(questions.surveyId, surveyId));
    const position = maxPosition === null ? 0 : maxPosition + 1;

    const [question] = await tx
      .insert(questions)
      .values({
        surveyId,
        position,
        prompt: q.prompt,
        required: q.required,
        type: q.type,
        config: q.config ?? null,
      })
      .returning({ id: questions.id });

    if (q.options.length > 0) {
      await tx.insert(questionOptions).values(
        q.options.map((opt, i) => ({ questionId: question.id, position: i, label: opt.label })),
      );
    }

    return { id: question.id };
  });
}

export async function putQuestion(surveyId: string, qid: string, q: QuestionInput): Promise<void> {
  if (q.type === 'rating') assertValidRatingConfig(q.config);
  await db.transaction(async (tx) => {
    const [survey] = await tx.select({ status: surveys.status }).from(surveys).where(eq(surveys.id, surveyId));
    if (!survey) throw new DomainError('NOT_FOUND');

    const [question] = await tx
      .select()
      .from(questions)
      .where(and(eq(questions.id, qid), eq(questions.surveyId, surveyId)));
    if (!question) throw new DomainError('NOT_FOUND');

    if (q.type !== question.type && survey.status !== 'draft') {
      throw new DomainError('QUESTIONS_FROZEN', 'question type cannot change once published');
    }

    await tx
      .update(questions)
      .set({
        prompt: q.prompt,
        required: q.required,
        config: q.config ?? null,
        type: q.type,
      })
      .where(eq(questions.id, qid));

    const storedRows = await tx
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, qid))
      .orderBy(questionOptions.position);
    const stored: StoredOption[] = storedRows.map((o) => ({ id: o.id, position: o.position, label: o.label }));

    const plan = reconcileOptions(stored, q.options, survey.status);

    for (const del of plan.deletes) {
      await tx.delete(questionOptions).where(eq(questionOptions.id, del));
    }
    for (const upd of plan.updates) {
      await tx
        .update(questionOptions)
        .set({ label: upd.label, position: upd.position })
        .where(eq(questionOptions.id, upd.id));
    }
    if (plan.inserts.length > 0) {
      await tx.insert(questionOptions).values(
        plan.inserts.map((ins) => ({ questionId: qid, label: ins.label, position: ins.position })),
      );
    }
  });
}

export async function deleteQuestion(surveyId: string, qid: string): Promise<void> {
  const [survey] = await db.select({ status: surveys.status }).from(surveys).where(eq(surveys.id, surveyId));
  if (!survey) throw new DomainError('NOT_FOUND');
  if (survey.status !== 'draft') {
    throw new DomainError('QUESTIONS_FROZEN', 'questions cannot be removed once published');
  }

  const result = await db
    .delete(questions)
    .where(and(eq(questions.id, qid), eq(questions.surveyId, surveyId)))
    .returning({ id: questions.id });
  if (result.length === 0) throw new DomainError('NOT_FOUND');
}

export async function publishSurvey(id: string): Promise<{ slug: string }> {
  const [survey] = await db.select({ status: surveys.status }).from(surveys).where(eq(surveys.id, id));
  if (!survey) throw new DomainError('NOT_FOUND');
  if (survey.status !== 'draft') throw new DomainError('SURVEY_CLOSED', 'not a draft');

  const existingQuestions = await db.select({ id: questions.id }).from(questions).where(eq(questions.surveyId, id)).limit(1);
  if (existingQuestions.length === 0) throw new DomainError('INVALID_ANSWER', 'survey has no questions');

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const slug = randomSlug();
    try {
      await db
        .update(surveys)
        .set({ slug, status: 'published', publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(surveys.id, id));
      return { slug };
    } catch (e) {
      if (isUniqueViolation(e) && attempt < maxAttempts) continue;
      throw e;
    }
  }
  throw new Error('unreachable');
}

export async function closeSurvey(id: string): Promise<void> {
  const [survey] = await db.select({ status: surveys.status }).from(surveys).where(eq(surveys.id, id));
  if (!survey) throw new DomainError('NOT_FOUND');
  if (survey.status !== 'published') throw new DomainError('SURVEY_CLOSED', 'not published');

  await db
    .update(surveys)
    .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
    .where(eq(surveys.id, id));
}

export async function getResults(id: string): Promise<{ responseCount: number; results: QuestionResult[] }> {
  const withQuestions = await getSurveyWithQuestions(id);
  if (!withQuestions) throw new DomainError('NOT_FOUND');

  const [{ responseCount }] = await db
    .select({ responseCount: count() })
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, id));

  const answerRows = await db
    .select({
      questionId: answers.questionId,
      optionId: answers.optionId,
      textValue: answers.textValue,
      numberValue: answers.numberValue,
    })
    .from(answers)
    .innerJoin(surveyResponses, eq(answers.responseId, surveyResponses.id))
    .where(eq(surveyResponses.surveyId, id));

  const rows: AnswerRow[] = answerRows.map((r) => ({
    questionId: r.questionId,
    optionId: r.optionId,
    textValue: r.textValue,
    numberValue: r.numberValue,
  }));

  const results = computeTally(withQuestions.questions, rows);
  return { responseCount, results };
}
