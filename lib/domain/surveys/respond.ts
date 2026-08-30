import { DomainError } from '../shared/errors';
import type { QuestionWithOptions } from './types';

export type AnswerValue = string | string[] | number;

export interface AnswerRow {
  questionId: string;
  optionId: string | null;
  textValue: string | null;
  numberValue: number | null;
}

export function validateResponse(
  questions: QuestionWithOptions[],
  input: Record<string, AnswerValue | undefined>,
): AnswerRow[] {
  const questionIds = new Set(questions.map((q) => q.id));
  for (const key of Object.keys(input)) {
    if (!questionIds.has(key)) {
      throw new DomainError('INVALID_ANSWER', `unknown question id: ${key}`);
    }
  }

  const rows: AnswerRow[] = [];

  for (const question of questions) {
    const value = input[question.id];

    if (value === undefined) {
      if (question.required) {
        throw new DomainError('INVALID_ANSWER', `missing required answer for question ${question.id}`);
      }
      continue;
    }

    switch (question.type) {
      case 'single_choice': {
        if (typeof value !== 'string') {
          throw new DomainError(
            'INVALID_ANSWER',
            `single_choice answer must be a single option id (question ${question.id})`,
          );
        }
        assertOptionBelongs(question, value);
        rows.push({ questionId: question.id, optionId: value, textValue: null, numberValue: null });
        break;
      }
      case 'multi_choice': {
        if (!Array.isArray(value)) {
          throw new DomainError(
            'INVALID_ANSWER',
            `multi_choice answer must be an array of option ids (question ${question.id})`,
          );
        }
        if (question.required && value.length === 0) {
          throw new DomainError('INVALID_ANSWER', `missing required answer for question ${question.id}`);
        }
        const seen = new Set<string>();
        for (const optionId of value) {
          if (typeof optionId !== 'string') {
            throw new DomainError(
              'INVALID_ANSWER',
              `multi_choice answer must be an array of option ids (question ${question.id})`,
            );
          }
          if (seen.has(optionId)) {
            throw new DomainError('INVALID_ANSWER', `duplicate option (question ${question.id})`);
          }
          seen.add(optionId);
          assertOptionBelongs(question, optionId);
          rows.push({ questionId: question.id, optionId, textValue: null, numberValue: null });
        }
        break;
      }
      case 'free_text': {
        if (typeof value !== 'string') {
          throw new DomainError('INVALID_ANSWER', `free_text answer must be a string (question ${question.id})`);
        }
        if (question.required && value.trim().length === 0) {
          throw new DomainError('INVALID_ANSWER', `free_text answer is required (question ${question.id})`);
        }
        if (value.length > 10000) {
          throw new DomainError('INVALID_ANSWER', `free_text answer is too long (question ${question.id})`);
        }
        rows.push({ questionId: question.id, optionId: null, textValue: value, numberValue: null });
        break;
      }
      case 'rating': {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          throw new DomainError('INVALID_ANSWER', `rating answer must be an integer (question ${question.id})`);
        }
        const config = question.config;
        if (!config || value < config.min || value > config.max) {
          throw new DomainError('INVALID_ANSWER', `rating answer out of range (question ${question.id})`);
        }
        rows.push({ questionId: question.id, optionId: null, textValue: null, numberValue: value });
        break;
      }
    }
  }

  return rows;
}

function assertOptionBelongs(question: QuestionWithOptions, optionId: string): void {
  if (!question.options.some((o) => o.id === optionId)) {
    throw new DomainError('INVALID_ANSWER', `option ${optionId} does not belong to question ${question.id}`);
  }
}
