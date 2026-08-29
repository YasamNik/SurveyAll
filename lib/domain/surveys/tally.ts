import type { AnswerRow } from './respond';
import type { QuestionType, QuestionWithOptions } from './types';

export interface QuestionResult {
  questionId: string;
  prompt: string;
  type: QuestionType;
  optionCounts?: { optionId: string; label: string; count: number }[];
  texts?: string[];
  ratingAverage?: number | null;
  ratingCounts?: { value: number; count: number }[];
}

export function computeTally(questions: QuestionWithOptions[], answers: AnswerRow[]): QuestionResult[] {
  const byQuestion = new Map<string, AnswerRow[]>();
  for (const answer of answers) {
    const rows = byQuestion.get(answer.questionId);
    if (rows) {
      rows.push(answer);
    } else {
      byQuestion.set(answer.questionId, [answer]);
    }
  }

  return questions.map((question) => {
    const rows = byQuestion.get(question.id) ?? [];
    const base = { questionId: question.id, prompt: question.prompt, type: question.type };

    switch (question.type) {
      case 'single_choice':
      case 'multi_choice': {
        const counts = new Map<string, number>();
        for (const row of rows) {
          if (row.optionId === null) continue;
          counts.set(row.optionId, (counts.get(row.optionId) ?? 0) + 1);
        }
        const optionCounts = [...question.options]
          .sort((a, b) => a.position - b.position)
          .map((option) => ({ optionId: option.id, label: option.label, count: counts.get(option.id) ?? 0 }));
        return { ...base, optionCounts };
      }
      case 'free_text': {
        const texts = rows.filter((row) => row.textValue !== null).map((row) => row.textValue as string);
        return { ...base, texts };
      }
      case 'rating': {
        const values = rows.filter((row) => row.numberValue !== null).map((row) => row.numberValue as number);
        const ratingAverage = values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;
        const min = question.config?.min ?? 0;
        const max = question.config?.max ?? 0;
        const ratingCounts: { value: number; count: number }[] = [];
        for (let value = min; value <= max; value++) {
          ratingCounts.push({ value, count: values.filter((v) => v === value).length });
        }
        return { ...base, ratingAverage, ratingCounts };
      }
    }
  });
}
