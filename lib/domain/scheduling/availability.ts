import { DomainError } from '../shared/errors';

/**
 * Validates a participant's painted availability against the event's slot grid.
 * Dedupes, requires every entry to be a member of the grid, and returns the
 * result sorted ascending.
 */
export function validatePaintedSlots(grid: string[], painted: unknown): string[] {
  if (!Array.isArray(painted)) {
    throw new DomainError('INVALID_ANSWER', 'painted slots must be an array');
  }
  if (painted.some((slot) => typeof slot !== 'string')) {
    throw new DomainError('INVALID_ANSWER', 'painted slots must be strings');
  }

  const gridSet = new Set(grid);
  const deduped = Array.from(new Set(painted as string[]));

  for (const slot of deduped) {
    if (!gridSet.has(slot)) {
      throw new DomainError('INVALID_ANSWER', 'slot outside the event grid');
    }
  }

  return deduped.sort();
}
