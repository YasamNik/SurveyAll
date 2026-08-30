import type { QuestionType } from '@/lib/domain/surveys/types';

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multi_choice', label: 'Multiple choice' },
  { value: 'free_text', label: 'Free text' },
  { value: 'rating', label: 'Rating' },
];

export function typeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}
