import { describe, it, expect } from 'vitest';
import { assertValidRatingConfig } from './rating';
import { DomainError } from '../shared/errors';

describe('assertValidRatingConfig', () => {
  it('accepts a valid config', () => {
    expect(() => assertValidRatingConfig({ min: 1, max: 5 })).not.toThrow();
  });

  it('accepts a valid config at the max allowed span (10)', () => {
    expect(() => assertValidRatingConfig({ min: 0, max: 10 })).not.toThrow();
  });

  it('rejects min >= max', () => {
    expect(() => assertValidRatingConfig({ min: 5, max: 5 })).toThrow(DomainError);
    expect(() => assertValidRatingConfig({ min: 6, max: 5 })).toThrow(DomainError);
  });

  it('rejects a span greater than 10', () => {
    expect(() => assertValidRatingConfig({ min: 0, max: 11 })).toThrow(DomainError);
    expect(() => assertValidRatingConfig({ min: 0, max: 2_000_000_000 })).toThrow(DomainError);
  });

  it('rejects non-integer bounds', () => {
    expect(() => assertValidRatingConfig({ min: 1.5, max: 5 })).toThrow(DomainError);
    expect(() => assertValidRatingConfig({ min: 1, max: 5.5 })).toThrow(DomainError);
    expect(() => assertValidRatingConfig({ min: NaN, max: 5 })).toThrow(DomainError);
  });

  it('rejects a null or missing config', () => {
    expect(() => assertValidRatingConfig(null)).toThrow(DomainError);
    expect(() => assertValidRatingConfig(undefined)).toThrow(DomainError);
  });

  it('throws with code INVALID_ANSWER', () => {
    try {
      assertValidRatingConfig({ min: 5, max: 1 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe('INVALID_ANSWER');
    }
  });
});
