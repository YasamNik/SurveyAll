import { describe, it, expect } from 'vitest';
import { validatePaintedSlots } from './availability';
import { DomainError } from '../shared/errors';

function expectInvalidAnswer(fn: () => void) {
  expect(fn).toThrow(DomainError);
  try {
    fn();
    expect.unreachable();
  } catch (e) {
    expect((e as DomainError).code).toBe('INVALID_ANSWER');
  }
}

const grid = [
  '2026-06-01T09:00:00.000Z',
  '2026-06-01T09:30:00.000Z',
  '2026-06-01T10:00:00.000Z',
];

describe('validatePaintedSlots — happy paths', () => {
  it('returns the painted slots, sorted', () => {
    const result = validatePaintedSlots(grid, [
      '2026-06-01T10:00:00.000Z',
      '2026-06-01T09:00:00.000Z',
    ]);
    expect(result).toEqual(['2026-06-01T09:00:00.000Z', '2026-06-01T10:00:00.000Z']);
  });

  it('returns an empty array for empty input', () => {
    expect(validatePaintedSlots(grid, [])).toEqual([]);
  });

  it('deduplicates repeated slots', () => {
    const result = validatePaintedSlots(grid, [
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T09:30:00.000Z',
    ]);
    expect(result).toEqual(['2026-06-01T09:00:00.000Z', '2026-06-01T09:30:00.000Z']);
  });

  it('accepts the full grid', () => {
    const result = validatePaintedSlots(grid, [...grid]);
    expect(result).toEqual([...grid].sort());
  });
});

describe('validatePaintedSlots — length cap', () => {
  it('accepts an array exactly grid.length long', () => {
    const result = validatePaintedSlots(grid, [...grid]);
    expect(result).toHaveLength(grid.length);
  });

  it('rejects an oversized, duplicate-heavy array before paying dedup cost', () => {
    const huge = new Array(1_000_000).fill(grid[0]);
    expectInvalidAnswer(() => validatePaintedSlots(grid, huge));
  });
});

describe('validatePaintedSlots — throws INVALID_ANSWER', () => {
  it('rejects a slot outside the event grid', () => {
    expectInvalidAnswer(() => validatePaintedSlots(grid, ['2026-06-01T09:00:00.000Z', '1999-01-01T00:00:00.000Z']));
  });

  it('rejects a non-array input', () => {
    expectInvalidAnswer(() => validatePaintedSlots(grid, '2026-06-01T09:00:00.000Z'));
  });

  it('rejects null input', () => {
    expectInvalidAnswer(() => validatePaintedSlots(grid, null));
  });

  it('rejects undefined input', () => {
    expectInvalidAnswer(() => validatePaintedSlots(grid, undefined));
  });

  it('rejects an array containing a non-string entry', () => {
    expectInvalidAnswer(() => validatePaintedSlots(grid, ['2026-06-01T09:00:00.000Z', 42]));
  });

  it('rejects an array of objects', () => {
    expectInvalidAnswer(() => validatePaintedSlots(grid, [{ slot: grid[0] }]));
  });
});
