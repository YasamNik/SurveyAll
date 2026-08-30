'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  addQuestion,
  closeSurvey,
  createSurvey,
  deleteQuestion,
  patchSurvey,
  publishSurvey,
  putQuestion,
} from '@/lib/db/queries/surveys';
import { DomainError } from '@/lib/domain/shared/errors';
import type { OptionInput, QuestionInput, QuestionType } from '@/lib/domain/surveys/types';
import { isThemeId } from '@/lib/themes';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const PROMPT_MAX = 500;
const OPTION_LABEL_MAX = 200;

function toEditor(surveyId: string, opts?: { error?: string; section?: string }): never {
  const qs = new URLSearchParams();
  if (opts?.error) qs.set('error', opts.error);
  if (opts?.section) qs.set('section', opts.section);
  const suffix = qs.toString();
  redirect(`/surveys/${surveyId}${suffix ? `?${suffix}` : ''}`);
}

function parseOptions(raw: string, existingIds: string[]): OptionInput[] {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.map((label, i) => (i < existingIds.length ? { id: existingIds[i], label } : { label }));
}

function parseQuestionInput(formData: FormData, existingOptionIds: string[]): QuestionInput {
  const prompt = String(formData.get('prompt') ?? '').trim();
  const type = String(formData.get('type') ?? 'free_text') as QuestionType;
  const required = formData.get('required') === 'on';
  const options =
    type === 'single_choice' || type === 'multi_choice'
      ? parseOptions(String(formData.get('options') ?? ''), existingOptionIds)
      : [];
  const config =
    type === 'rating'
      ? { min: parseRatingBound(formData.get('min')), max: parseRatingBound(formData.get('max')) }
      : null;
  return { prompt, type, required, config, options };
}

// Empty/missing form values must not silently become 0 — that would bypass the
// rating range check downstream. Number(null) is 0 and Number('') is also 0, so
// both are normalized to NaN, which the domain guard rejects.
function parseRatingBound(raw: FormDataEntryValue | null): number {
  if (raw === null || raw === '') return NaN;
  return Number(raw);
}

export async function createSurveyAction(formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!title) redirect(`/surveys?error=${encodeURIComponent('Title is required')}`);
  if (title.length > TITLE_MAX)
    redirect(`/surveys?error=${encodeURIComponent(`Title is too long (max ${TITLE_MAX} characters)`)}`);
  if (description.length > DESCRIPTION_MAX)
    redirect(`/surveys?error=${encodeURIComponent(`Description is too long (max ${DESCRIPTION_MAX} characters)`)}`);
  const { id } = await createSurvey({ title, description: description || undefined });
  redirect(`/surveys/${id}`);
}

export async function patchSurveyAction(surveyId: string, formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const theme = String(formData.get('theme') ?? 'classic').trim();
  if (!title) toEditor(surveyId, { error: 'Title is required', section: 'details' });
  if (title.length > TITLE_MAX)
    toEditor(surveyId, { error: `Title is too long (max ${TITLE_MAX} characters)`, section: 'details' });
  if (description.length > DESCRIPTION_MAX)
    toEditor(surveyId, { error: `Description is too long (max ${DESCRIPTION_MAX} characters)`, section: 'details' });
  if (!isThemeId(theme)) toEditor(surveyId, { error: 'Invalid theme', section: 'details' });
  try {
    await patchSurvey(surveyId, { title, description, theme });
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section: 'details' });
    throw e;
  }
  revalidatePath(`/surveys/${surveyId}`);
  toEditor(surveyId);
}

export async function toggleResultsAction(surveyId: string, next: boolean): Promise<void> {
  try {
    await patchSurvey(surveyId, { showResultsToRespondents: next });
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section: 'details' });
    throw e;
  }
  revalidatePath(`/surveys/${surveyId}`);
  toEditor(surveyId);
}

export async function addQuestionAction(surveyId: string, formData: FormData): Promise<void> {
  const input = parseQuestionInput(formData, []);
  if (!input.prompt) toEditor(surveyId, { error: 'Prompt is required', section: 'add-question' });
  if (input.prompt.length > PROMPT_MAX)
    toEditor(surveyId, { error: `Prompt is too long (max ${PROMPT_MAX} characters)`, section: 'add-question' });
  if (input.options.some((o) => o.label.length > OPTION_LABEL_MAX))
    toEditor(surveyId, { error: `Option is too long (max ${OPTION_LABEL_MAX} characters)`, section: 'add-question' });
  try {
    await addQuestion(surveyId, input);
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section: 'add-question' });
    throw e;
  }
  revalidatePath(`/surveys/${surveyId}`);
  toEditor(surveyId);
}

export async function putQuestionAction(
  surveyId: string,
  questionId: string,
  existingOptionIds: string[],
  formData: FormData,
): Promise<void> {
  const input = parseQuestionInput(formData, existingOptionIds);
  const section = `question-${questionId}`;
  if (!input.prompt) toEditor(surveyId, { error: 'Prompt is required', section });
  if (input.prompt.length > PROMPT_MAX)
    toEditor(surveyId, { error: `Prompt is too long (max ${PROMPT_MAX} characters)`, section });
  if (input.options.some((o) => o.label.length > OPTION_LABEL_MAX))
    toEditor(surveyId, { error: `Option is too long (max ${OPTION_LABEL_MAX} characters)`, section });
  try {
    await putQuestion(surveyId, questionId, input);
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section });
    throw e;
  }
  revalidatePath(`/surveys/${surveyId}`);
  toEditor(surveyId);
}

export async function deleteQuestionAction(surveyId: string, questionId: string): Promise<void> {
  try {
    await deleteQuestion(surveyId, questionId);
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section: `question-${questionId}` });
    throw e;
  }
  revalidatePath(`/surveys/${surveyId}`);
  toEditor(surveyId);
}

export async function publishSurveyAction(surveyId: string): Promise<void> {
  try {
    await publishSurvey(surveyId);
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section: 'status' });
    throw e;
  }
  revalidatePath(`/surveys/${surveyId}`);
  toEditor(surveyId);
}

export async function closeSurveyAction(surveyId: string): Promise<void> {
  try {
    await closeSurvey(surveyId);
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section: 'status' });
    throw e;
  }
  revalidatePath(`/surveys/${surveyId}`);
  toEditor(surveyId);
}
