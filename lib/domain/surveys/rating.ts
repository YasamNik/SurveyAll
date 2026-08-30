import { DomainError } from '../shared/errors';
import type { RatingConfig } from './types';

const MAX_SPAN = 10;

/** Single source of truth for rating question bounds: integers, min < max, span capped at 10. */
export function assertValidRatingConfig(config: RatingConfig | null | undefined): void {
  if (!config || !Number.isInteger(config.min) || !Number.isInteger(config.max)) {
    throw new DomainError('INVALID_ANSWER', 'invalid rating range');
  }
  if (config.min >= config.max) {
    throw new DomainError('INVALID_ANSWER', 'invalid rating range');
  }
  if (config.max - config.min > MAX_SPAN) {
    throw new DomainError('INVALID_ANSWER', 'invalid rating range');
  }
}
