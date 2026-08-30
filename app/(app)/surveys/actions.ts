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
      ? { min: Number(formData.get('min') ?? 1), max: Number(formData.get('max') ?? 5) }
      : null;
  return { prompt, type, required, config, options };
}

export async function createSurveyAction(formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!title) redirect(`/surveys?error=${encodeURIComponent('Title is required')}`);
  const { id } = await createSurvey({ title, description: description || undefined });
  redirect(`/surveys/${id}`);
}

export async function patchSurveyAction(surveyId: string, formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!title) toEditor(surveyId, { error: 'Title is required', section: 'details' });
  try {
    await patchSurvey(surveyId, { title, description });
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
  try {
    await putQuestion(surveyId, questionId, input);
  } catch (e) {
    if (e instanceof DomainError) toEditor(surveyId, { error: e.message, section: `question-${questionId}` });
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
