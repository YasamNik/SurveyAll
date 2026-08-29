import { describe, it, expect } from 'vitest';
import { validateResponse } from './respond';
import { DomainError } from '../shared/errors';
import type { QuestionWithOptions } from './types';

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
    { id: 'o3', position: 0, label: 'Git' },
    { id: 'o4', position: 1, label: 'Docker' },
  ],
};

const freeText: QuestionWithOptions = {
  id: 'q3',
  position: 2,
  prompt: 'Any comments?',
  required: true,
  type: 'free_text',
  config: null,
  options: [],
};

const optionalFreeText: QuestionWithOptions = {
  ...freeText,
  id: 'q3b',
  required: false,
};

const rating: QuestionWithOptions = {
  id: 'q4',
  position: 3,
  prompt: 'Rate 1-5',
  required: true,
  type: 'rating',
  config: { min: 1, max: 5 },
  options: [],
};

const optionalRating: QuestionWithOptions = {
  ...rating,
  id: 'q4b',
  required: false,
};

describe('validateResponse — happy paths', () => {
  it('single_choice produces one row with optionId', () => {
    const rows = validateResponse([singleChoice], { q1: 'o1' });
    expect(rows).toEqual([{ questionId: 'q1', optionId: 'o1', textValue: null, numberValue: null }]);
  });

  it('multi_choice produces one row per selected option', () => {
    const rows = validateResponse([multiChoice], { q2: ['o3', 'o4'] });
    expect(rows).toEqual([
      { questionId: 'q2', optionId: 'o3', textValue: null, numberValue: null },
      { questionId: 'q2', optionId: 'o4', textValue: null, numberValue: null },
    ]);
  });

  it('free_text produces one row with textValue', () => {
    const rows = validateResponse([freeText], { q3: 'Great survey' });
    expect(rows).toEqual([{ questionId: 'q3', optionId: null, textValue: 'Great survey', numberValue: null }]);
  });

  it('rating produces one row with numberValue', () => {
    const rows = validateResponse([rating], { q4: 4 });
    expect(rows).toEqual([{ questionId: 'q4', optionId: null, textValue: null, numberValue: 4 }]);
  });

  it('optional unanswered question produces no row', () => {
    const rows = validateResponse([multiChoice], {});
    expect(rows).toEqual([]);
  });

  it('optional free_text left undefined produces no row', () => {
    const rows = validateResponse([optionalFreeText], {});
    expect(rows).toEqual([]);
  });

  it('optional rating left undefined produces no row', () => {
    const rows = validateResponse([optionalRating], {});
    expect(rows).toEqual([]);
  });

  it('handles a full set of question types together', () => {
    const rows = validateResponse(
      [singleChoice, multiChoice, freeText, rating],
      { q1: 'o1', q2: ['o3'], q3: 'ok', q4: 5 },
    );
    expect(rows).toHaveLength(4);
  });
});

describe('validateResponse — throws INVALID_ANSWER', () => {
  it('missing required answer', () => {
    expect(() => validateResponse([singleChoice], {})).toThrow(DomainError);
    try {
      validateResponse([singleChoice], {});
    } catch (e) {
      expect((e as DomainError).code).toBe('INVALID_ANSWER');
    }
  });

  it('unknown question id key in input', () => {
    expect(() => validateResponse([singleChoice], { q1: 'o1', bogus: 'x' })).toThrow(DomainError);
  });

  it('option id not belonging to the question', () => {
    expect(() => validateResponse([singleChoice], { q1: 'not-an-option' })).toThrow(DomainError);
  });

  it('multiple selections for single_choice (array of length > 1)', () => {
    expect(() => validateResponse([singleChoice], { q1: ['o1', 'o2'] })).toThrow(DomainError);
  });

  it('single_choice given a non-string, non-array value', () => {
    expect(() => validateResponse([singleChoice], { q1: 42 })).toThrow(DomainError);
  });

  it('multi_choice given a plain string instead of an array', () => {
    expect(() => validateResponse([multiChoice], { q2: 'o3' })).toThrow(DomainError);
  });

  it('rating below config.min', () => {
    expect(() => validateResponse([rating], { q4: 0 })).toThrow(DomainError);
  });

  it('rating above config.max', () => {
    expect(() => validateResponse([rating], { q4: 6 })).toThrow(DomainError);
  });

  it('rating that is not an integer', () => {
    expect(() => validateResponse([rating], { q4: 3.5 })).toThrow(DomainError);
  });

  it('rating given as a non-number', () => {
    expect(() => validateResponse([rating], { q4: 'high' })).toThrow(DomainError);
  });

  it('empty free_text on a required question', () => {
    expect(() => validateResponse([freeText], { q3: '' })).toThrow(DomainError);
  });

  it('whitespace-only free_text on a required question', () => {
    expect(() => validateResponse([freeText], { q3: '   ' })).toThrow(DomainError);
  });

  it('free_text given a non-string value', () => {
    expect(() => validateResponse([freeText], { q3: 5 })).toThrow(DomainError);
  });

  it('all errors carry the INVALID_ANSWER code', () => {
    try {
      validateResponse([singleChoice], { q1: 'o1', bogus: 'x' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe('INVALID_ANSWER');
    }
  });
});
