import { describe, it, expect } from 'vitest';
import {
  dayKeyOf,
  dayLabelOf,
  timeKeyOf,
  heatmapStep,
  heatmapBg,
  HEATMAP_GREENS,
  exceedsTouchSlop,
  TOUCH_SLOP_PX,
  decideSaveAction,
} from './grid-locale';

describe('dayKeyOf / dayLabelOf / timeKeyOf', () => {
  it('buckets a known instant in a fixed zone (America/Toronto)', () => {
    // 2026-03-03T14:00:00Z is 09:00 EST (Toronto is UTC-5 in March, before DST).
    const d = new Date('2026-03-03T14:00:00.000Z');
    expect(dayKeyOf(d, 'America/Toronto')).toBe('2026-03-03');
    expect(dayLabelOf(d, 'America/Toronto')).toBe('Tue Mar 3');
    expect(timeKeyOf(d, 'America/Toronto')).toBe('09:00');
  });

  it('buckets the same instant differently in a half-hour-offset zone (Asia/Kolkata, +5:30)', () => {
    const d = new Date('2026-03-03T14:00:00.000Z');
    expect(dayKeyOf(d, 'Asia/Kolkata')).toBe('2026-03-03');
    expect(timeKeyOf(d, 'Asia/Kolkata')).toBe('19:30');
  });

  it('a half-hour-offset zone still lands on the 30-minute grid, not a fractional minute', () => {
    // Two instants 30 minutes apart in UTC stay 30 minutes apart after a +5:30 shift.
    const a = new Date('2026-03-03T14:00:00.000Z');
    const b = new Date('2026-03-03T14:30:00.000Z');
    expect(timeKeyOf(a, 'Asia/Kolkata')).toBe('19:30');
    expect(timeKeyOf(b, 'Asia/Kolkata')).toBe('20:00');
  });

  it('a day boundary crossed by the zone shift lands in the correct day bucket', () => {
    // 2026-03-03T19:00:00Z is 2026-03-04T00:30 in Kolkata (+5:30) — already the next day.
    const d = new Date('2026-03-03T19:00:00.000Z');
    expect(dayKeyOf(d, 'America/Toronto')).toBe('2026-03-03');
    expect(dayKeyOf(d, 'Asia/Kolkata')).toBe('2026-03-04');
    expect(timeKeyOf(d, 'Asia/Kolkata')).toBe('00:30');
  });

  it('day/time union across two days in one zone stays on distinct, sorted buckets', () => {
    const day1 = new Date('2026-03-03T14:00:00.000Z');
    const day1Later = new Date('2026-03-03T14:30:00.000Z');
    const day2 = new Date('2026-03-04T14:00:00.000Z');

    const keys = [day1, day1Later, day2].map((d) => `${dayKeyOf(d, 'America/Toronto')}|${timeKeyOf(d, 'America/Toronto')}`);
    expect(new Set(keys).size).toBe(3);
    expect(keys).toEqual(['2026-03-03|09:00', '2026-03-03|09:30', '2026-03-04|09:00']);
  });

  it('clamps local midnight to 00:00 (rather than a possible "24:00")', () => {
    // 2026-03-03T05:00:00Z is exactly midnight in America/Toronto (UTC-5 in March).
    const midnight = new Date('2026-03-03T05:00:00.000Z');
    expect(timeKeyOf(midnight, 'America/Toronto')).toBe('00:00');
  });

  it('defaults to the runtime zone when no timeZone is given (component call shape)', () => {
    const d = new Date('2026-03-03T14:00:00.000Z');
    expect(dayKeyOf(d)).toBe(dayKeyOf(d, Intl.DateTimeFormat().resolvedOptions().timeZone));
  });
});

describe('heatmapStep / heatmapBg', () => {
  it('count 0 is not banded (paper, no fill)', () => {
    expect(heatmapStep(0, 5)).toBeNull();
    expect(heatmapBg(0, 5)).toBeUndefined();
  });

  it('participantCount 0 is not banded, regardless of count', () => {
    expect(heatmapStep(0, 0)).toBeNull();
  });

  it('bands the non-full ratios into thirds', () => {
    expect(heatmapStep(1, 4)).toBe(0); // 0.25 -> step 0
    expect(heatmapStep(2, 4)).toBe(1); // 0.5 -> step 1
    expect(heatmapStep(3, 4)).toBe(2); // 0.75, not full -> step 2
  });

  it('a full match (count === participantCount) always lands in the top step', () => {
    expect(heatmapStep(4, 4)).toBe(3); // 1.0 -> step 3
    expect(heatmapStep(1, 1)).toBe(3);
    expect(heatmapStep(7, 7)).toBe(3);
  });

  it('a near-full but partial match never reaches the top step when participantCount >= 2', () => {
    // 4 of 5 is 0.8 — under the old quartile scheme this banded as "full"; the
    // top step is now reserved exclusively for count === participantCount, so
    // "everyone available" reads unambiguously as the deepest green.
    expect(heatmapStep(4, 5)).toBe(2);
    expect(heatmapStep(9, 10)).toBe(2);
  });

  it('participantCount 1 with the sole participant painted is the full (last) step', () => {
    expect(heatmapStep(1, 1)).toBe(3);
    expect(heatmapBg(1, 1)).toBe(HEATMAP_GREENS[3]);
  });

  it('heatmapBg renders the green swatch matching the banded step', () => {
    expect(heatmapBg(1, 4)).toBe(HEATMAP_GREENS[0]);
    expect(heatmapBg(4, 4)).toBe(HEATMAP_GREENS[3]);
  });
});

describe('exceedsTouchSlop', () => {
  it('is false with no movement', () => {
    expect(exceedsTouchSlop(0, 0)).toBe(false);
  });

  it('is false exactly at the slop boundary, on either axis', () => {
    expect(exceedsTouchSlop(TOUCH_SLOP_PX, 0)).toBe(false);
    expect(exceedsTouchSlop(0, TOUCH_SLOP_PX)).toBe(false);
  });

  it('is true just past the slop boundary', () => {
    expect(exceedsTouchSlop(TOUCH_SLOP_PX + 1, 0)).toBe(true);
  });

  it('is true regardless of direction (negative deltas)', () => {
    expect(exceedsTouchSlop(-(TOUCH_SLOP_PX + 1), 0)).toBe(true);
  });

  it('combines dx/dy as a straight-line distance, not either axis alone', () => {
    // Neither axis alone exceeds the 8px slop, but the combined distance
    // (hypot(6, 6) ≈ 8.49) does.
    expect(exceedsTouchSlop(6, 6)).toBe(true);
  });

  it('respects a custom slop', () => {
    expect(exceedsTouchSlop(15, 0, 20)).toBe(false);
    expect(exceedsTouchSlop(25, 0, 20)).toBe(true);
  });
});

describe('decideSaveAction', () => {
  it('skips when there is nothing dirty, regardless of whether a save is in flight', () => {
    expect(decideSaveAction({ dirty: false, saving: false })).toBe('skip');
    expect(decideSaveAction({ dirty: false, saving: true })).toBe('skip');
  });

  it('saves now when dirty and no save is in flight', () => {
    expect(decideSaveAction({ dirty: true, saving: false })).toBe('save');
  });

  it('queues a trailing save when dirty and a save is already in flight', () => {
    expect(decideSaveAction({ dirty: true, saving: true })).toBe('queue');
  });
});
