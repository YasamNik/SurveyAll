import { describe, it, expect } from 'vitest';
import { validateRespondentName } from './respondent-name';
import { DomainError } from '../shared/errors';

describe('validateRespondentName', () => {
  describe('setting: none', () => {
    it('returns null regardless of the provided name', () => {
      expect(validateRespondentName('none', 'Alice')).toBeNull();
      expect(validateRespondentName('none', undefined)).toBeNull();
      expect(validateRespondentName('none', '')).toBeNull();
      expect(validateRespondentName('none', 123)).toBeNull();
    });
  });

  describe('setting: optional', () => {
    it('returns null when the name is absent', () => {
      expect(validateRespondentName('optional', undefined)).toBeNull();
    });

    it('returns null when the name is blank', () => {
      expect(validateRespondentName('optional', '')).toBeNull();
      expect(validateRespondentName('optional', '   ')).toBeNull();
    });

    it('returns the trimmed name when provided', () => {
      expect(validateRespondentName('optional', '  Alice  ')).toBe('Alice');
    });

    it('rejects a non-string name', () => {
      expect(() => validateRespondentName('optional', 123)).toThrow(DomainError);
      expect(() => validateRespondentName('optional', 123)).toThrow('name must be text');
    });

    it('accepts a name at exactly the 100-character cap after trimming', () => {
      const max = 'a'.repeat(100);
      expect(validateRespondentName('optional', max)).toBe(max);
    });

    it('rejects a name over the 100-character cap after trimming', () => {
      const long = 'a'.repeat(101);
      expect(() => validateRespondentName('optional', long)).toThrow(DomainError);
    });
  });

  describe('setting: required', () => {
    it('throws when the name is absent', () => {
      expect(() => validateRespondentName('required', undefined)).toThrow(DomainError);
    });

    it('throws when the name is blank after trimming', () => {
      expect(() => validateRespondentName('required', '   ')).toThrow(DomainError);
    });

    it('returns the trimmed name when provided', () => {
      expect(validateRespondentName('required', '  Bob  ')).toBe('Bob');
    });

    it('rejects a non-string name', () => {
      expect(() => validateRespondentName('required', [])).toThrow(DomainError);
      expect(() => validateRespondentName('required', [])).toThrow('name must be text');
    });

    it('rejects a name over the 100-character cap after trimming', () => {
      expect(() => validateRespondentName('required', 'a'.repeat(101))).toThrow(DomainError);
    });
  });

  it('throws INVALID_ANSWER with "name is required" when required and missing', () => {
    try {
      validateRespondentName('required', undefined);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe('INVALID_ANSWER');
      expect((e as DomainError).message).toBe('name is required');
    }
  });

  it('throws INVALID_ANSWER with the length message when too long', () => {
    try {
      validateRespondentName('optional', 'a'.repeat(101));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe('INVALID_ANSWER');
      expect((e as DomainError).message).toBe('name is too long (max 100 characters)');
    }
  });

  it('throws INVALID_ANSWER with "name must be text" for a non-string name', () => {
    try {
      validateRespondentName('optional', 123);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe('INVALID_ANSWER');
      expect((e as DomainError).message).toBe('name must be text');
    }
  });
});
