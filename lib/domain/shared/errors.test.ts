import { describe, it, expect } from 'vitest';
import { DomainError } from './errors';

describe('DomainError', () => {
  it('carries the given code', () => {
    const err = new DomainError('NOT_FOUND');
    expect(err.code).toBe('NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults message to the code when none given', () => {
    const err = new DomainError('SURVEY_CLOSED');
    expect(err.message).toBe('SURVEY_CLOSED');
  });

  it('uses the given message when provided', () => {
    const err = new DomainError('QUESTIONS_FROZEN', 'unknown option id');
    expect(err.code).toBe('QUESTIONS_FROZEN');
    expect(err.message).toBe('unknown option id');
  });
});
