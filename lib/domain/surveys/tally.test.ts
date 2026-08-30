import { describe, it, expect } from 'vitest';
import { computeTally } from './tally';
import type { QuestionWithOptions } from './types';
import type { AnswerRow } from './respond';

const singleChoice: QuestionWithOptions = {
  id: 'q1',
  position: 0,
  prompt: 'Favorite language?',
  required: true,
  type: 'single_choice',
  config: null,
  options: [
    { id: 'o1', position: 0, label: 'TS' },
    { id: 'o2', position: 1, label: 'Rust' },
    { id: 'o3', position: 2, label: 'Go' },
  ],
};

const multiChoice: QuestionWithOptions = {
  id: 'q2',
  position: 1,
  prompt: 'Which tools do you use?',
  required: false,
  type: 'multi_choice',
  config: null,
  options: [
    { id: 'o4', position: 0, label: 'Git' },
    { id: 'o5', position: 1, label: 'Docker' },
  ],
};

const freeText: QuestionWithOptions = {
  id: 'q3',
  position: 2,
  prompt: 'Any comments?',
  required: false,
  type: 'free_text',
  config: null,
  options: [],
};

const rating: QuestionWithOptions = {
  id: 'q4',
  position: 3,
  prompt: 'Rate 1-5',
  required: false,
  type: 'rating',
  config: { min: 1, max: 5 },
  options: [],
};

function row(partial: Partial<AnswerRow> & { questionId: string }): AnswerRow {
  return { optionId: null, textValue: null, numberValue: null, ...partial };
}

describe('computeTally — single_choice / multi_choice option counts', () => {
  it('includes zero-count options, ordered by option position', () => {
    const answers: AnswerRow[] = [row({ questionId: 'q1', optionId: 'o1' })];
    const [result] = computeTally([singleChoice], answers);
    expect(result.optionCounts).toEqual([
      { optionId: 'o1', label: 'TS', count: 1 },
      { optionId: 'o2', label: 'Rust', count: 0 },
      { optionId: 'o3', label: 'Go', count: 0 },
    ]);
  });

  it('counts each multi_choice selection independently', () => {
    const answers: AnswerRow[] = [
      row({ questionId: 'q2', optionId: 'o4' }),
      row({ questionId: 'q2', optionId: 'o5' }),
      row({ questionId: 'q2', optionId: 'o4' }),
    ];
    const [result] = computeTally([multiChoice], answers);
    expect(result.optionCounts).toEqual([
      { optionId: 'o4', label: 'Git', count: 2 },
      { optionId: 'o5', label: 'Docker', count: 1 },
    ]);
  });

  it('carries questionId, prompt, and type through', () => {
    const [result] = computeTally([singleChoice], []);
    expect(result.questionId).toBe('q1');
    expect(result.prompt).toBe('Favorite language?');
    expect(result.type).toBe('single_choice');
  });
});

describe('computeTally — free_text', () => {
  it('lists texts in submission (answers-array) order', () => {
    const answers: AnswerRow[] = [
      row({ questionId: 'q3', textValue: 'second' }),
      row({ questionId: 'q3', textValue: 'first' }),
    ];
    const [result] = computeTally([freeText], answers);
    expect(result.texts).toEqual(['second', 'first']);
  });

  it('is an empty array when there are no free_text answers', () => {
    const [result] = computeTally([freeText], []);
    expect(result.texts).toEqual([]);
  });
});

describe('computeTally — rating', () => {
  it('ratingAverage is null when there are no rating answers', () => {
    const [result] = computeTally([rating], []);
    expect(result.ratingAverage).toBeNull();
  });

  it('ratingCounts covers every integer min..max even with no answers', () => {
    const [result] = computeTally([rating], []);
    expect(result.ratingCounts).toEqual([
      { value: 1, count: 0 },
      { value: 2, count: 0 },
      { value: 3, count: 0 },
      { value: 4, count: 0 },
      { value: 5, count: 0 },
    ]);
  });

  it('computes the average and per-value counts from rating answers', () => {
    const answers: AnswerRow[] = [
      row({ questionId: 'q4', numberValue: 5 }),
      row({ questionId: 'q4', numberValue: 3 }),
      row({ questionId: 'q4', numberValue: 5 }),
    ];
    const [result] = computeTally([rating], answers);
    expect(result.ratingAverage).toBeCloseTo((5 + 3 + 5) / 3);
    expect(result.ratingCounts).toEqual([
      { value: 1, count: 0 },
      { value: 2, count: 0 },
      { value: 3, count: 1 },
      { value: 4, count: 0 },
      { value: 5, count: 2 },
    ]);
  });
});

describe('computeTally — defensive clamp for out-of-range stored config', () => {
  it('caps the ratingCounts span at 10 even if the stored config has a huge max', () => {
    const wideRating: QuestionWithOptions = { ...rating, config: { min: 0, max: 2_000_000_000 } };
    const [result] = computeTally([wideRating], []);
    expect(result.ratingCounts).toHaveLength(11);
    expect(result.ratingCounts?.[0].value).toBe(0);
    expect(result.ratingCounts?.[10].value).toBe(10);
  });
});

describe('computeTally — multiple questions in one pass', () => {
  it('groups answers by question and returns one result per question', () => {
    const answers: AnswerRow[] = [
      row({ questionId: 'q1', optionId: 'o1' }),
      row({ questionId: 'q2', optionId: 'o4' }),
      row({ questionId: 'q3', textValue: 'hi' }),
      row({ questionId: 'q4', numberValue: 2 }),
    ];
    const results = computeTally([singleChoice, multiChoice, freeText, rating], answers);
    expect(results.map((r) => r.questionId)).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});
