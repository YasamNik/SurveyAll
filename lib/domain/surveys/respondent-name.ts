import { DomainError } from '../shared/errors';
import type { RespondentNameSetting } from './types';

const NAME_MAX = 100;

/** Single source of truth for the respondent-name setting: none ignores whatever
 * is provided; optional and required both trim and cap provided names, and
 * required additionally rejects a missing/blank name. */
export function validateRespondentName(setting: RespondentNameSetting, name: unknown): string | null {
  if (setting === 'none') return null;

  const isBlank = name === undefined || name === null || (typeof name === 'string' && name.trim().length === 0);

  if (isBlank) {
    if (setting === 'required') {
      throw new DomainError('INVALID_ANSWER', 'name is required');
    }
    return null;
  }

  if (typeof name !== 'string') {
    throw new DomainError('INVALID_ANSWER', 'name must be text');
  }

  if (name.trim().length > NAME_MAX) {
    throw new DomainError('INVALID_ANSWER', 'name is too long (max 100 characters)');
  }

  return name.trim();
}
