import { count, eq } from 'drizzle-orm';
import { db } from '../client';
import { answers, surveyResponses, surveys } from '../schema';
import { loadQuestionsWithOptions } from './surveys';
import { DomainError } from '@/lib/domain/shared/errors';
import { validateResponse, type AnswerRow, type AnswerValue } from '@/lib/domain/surveys/respond';
import { computeTally, type QuestionResult } from '@/lib/domain/surveys/tally';
import type { QuestionWithOptions } from '@/lib/domain/surveys/types';

export async function getPublishedSurveyBySlug(
  slug: string,
): Promise<{ survey: typeof surveys.$inferSelect; questions: QuestionWithOptions[] }> {
  const [survey] = await db.select().from(surveys).where(eq(surveys.slug, slug));
  if (!survey || survey.status === 'draft') throw new DomainError('NOT_FOUND');

  const questionRows = await loadQuestionsWithOptions(survey.id);
  return { survey, questions: questionRows };
}

export async function submitResponse(
  slug: string,
  input: Record<string, AnswerValue>,
  meta: { ipHash: string | null; clientToken: string | null },
): Promise<{ id: string }> {
  const [survey] = await db.select().from(surveys).where(eq(surveys.slug, slug));
  if (!survey || survey.status === 'draft') throw new DomainError('NOT_FOUND');
  if (survey.status === 'closed') throw new DomainError('SURVEY_CLOSED');

  const questionRows = await loadQuestionsWithOptions(survey.id);

  return db.transaction(async (tx) => {
    const rows = validateResponse(questionRows, input);

    const [response] = await tx
      .insert(surveyResponses)
      .values({ surveyId: survey.id, clientToken: meta.clientToken, ipHash: meta.ipHash })
      .returning({ id: surveyResponses.id });

    if (rows.length > 0) {
      await tx.insert(answers).values(
        rows.map((r) => ({
          responseId: response.id,
          questionId: r.questionId,
          optionId: r.optionId,
          textValue: r.textValue,
          numberValue: r.numberValue,
        })),
      );
    }

    return { id: response.id };
  });
}

export async function getPublicResults(slug: string): Promise<{ responseCount: number; results: QuestionResult[] }> {
  const { survey, questions: questionRows } = await getPublishedSurveyBySlug(slug);
  if (!survey.showResultsToRespondents) throw new DomainError('RESULTS_HIDDEN');

  const [{ responseCount }] = await db
    .select({ responseCount: count() })
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, survey.id));

  const answerRows = await db
    .select({
      questionId: answers.questionId,
      optionId: answers.optionId,
      textValue: answers.textValue,
      numberValue: answers.numberValue,
    })
    .from(answers)
    .innerJoin(surveyResponses, eq(answers.responseId, surveyResponses.id))
    .where(eq(surveyResponses.surveyId, survey.id));

  const rows: AnswerRow[] = answerRows.map((r) => ({
    questionId: r.questionId,
    optionId: r.optionId,
    textValue: r.textValue,
    numberValue: r.numberValue,
  }));

  const results = computeTally(questionRows, rows);
  return { responseCount, results };
}
