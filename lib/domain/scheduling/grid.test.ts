import { describe, it, expect } from 'vitest';
import { generateSlots, validateEventWindow, type EventWindow } from './grid';
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

describe('generateSlots', () => {
  it('produces 18 slots for a single day, 09:00-18:00, UTC', () => {
    const w: EventWindow = {
      dateStart: '2026-06-01',
      dateEnd: '2026-06-01',
      dayStartTime: '09:00',
      dayEndTime: '18:00',
      authorTimezone: 'UTC',
      skipWeekends: false,
    };
    const slots = generateSlots(w);
    expect(slots).toHaveLength(18);
    expect(slots[0]).toBe('2026-06-01T09:00:00.000Z');
    expect(slots[slots.length - 1]).toBe('2026-06-01T17:30:00.000Z');
  });

  it('produces slots for every day in a multi-day window', () => {
    const w: EventWindow = {
      dateStart: '2026-06-01',
      dateEnd: '2026-06-02',
      dayStartTime: '09:00',
      dayEndTime: '12:00',
      authorTimezone: 'UTC',
      skipWeekends: false,
    };
    const slots = generateSlots(w);
    // 3 hours/day = 6 slots/day, 2 days = 12 slots
    expect(slots).toHaveLength(12);
    expect(slots[0]).toBe('2026-06-01T09:00:00.000Z');
    expect(slots[5]).toBe('2026-06-01T11:30:00.000Z');
    expect(slots[6]).toBe('2026-06-02T09:00:00.000Z');
    expect(slots[11]).toBe('2026-06-02T11:30:00.000Z');
  });

  it('returns slots sorted ascending', () => {
    const w: EventWindow = {
      dateStart: '2026-06-01',
      dateEnd: '2026-06-03',
      dayStartTime: '09:00',
      dayEndTime: '10:00',
      authorTimezone: 'UTC',
      skipWeekends: false,
    };
    const slots = generateSlots(w);
    const sorted = [...slots].sort();
    expect(slots).toEqual(sorted);
  });

  it('produces the DST day actual instants, deduping wall times that fold onto the same instant', () => {
    // 2026-03-08: America/Toronto springs forward 02:00 -> 03:00 local at 07:00 UTC.
    // 02:00 and 02:30 local do not exist; the double-conversion resolves them onto the
    // same instants as 01:00 and 01:30 respectively, so the deduped result has 4 slots,
    // not the naive 6.
    const w: EventWindow = {
      dateStart: '2026-03-08',
      dateEnd: '2026-03-08',
      dayStartTime: '01:00',
      dayEndTime: '04:00',
      authorTimezone: 'America/Toronto',
      skipWeekends: false,
    };
    const slots = generateSlots(w);
    expect(slots).toEqual([
      '2026-03-08T06:00:00.000Z',
      '2026-03-08T06:30:00.000Z',
      '2026-03-08T07:00:00.000Z',
      '2026-03-08T07:30:00.000Z',
    ]);
  });

  it('excludes Saturday and Sunday calendar dates when skipWeekends is true', () => {
    // 2026-06-01 (Mon) .. 2026-06-07 (Sun): a full week.
    const w: EventWindow = {
      dateStart: '2026-06-01',
      dateEnd: '2026-06-07',
      dayStartTime: '09:00',
      dayEndTime: '10:00',
      authorTimezone: 'UTC',
      skipWeekends: true,
    };
    const slots = generateSlots(w);
    // 1 hour/day = 2 slots/day, 5 weekdays = 10 slots
    expect(slots).toHaveLength(10);
    expect(slots.every((iso) => {
      const day = new Date(iso).getUTCDay();
      return day !== 0 && day !== 6;
    })).toBe(true);
    expect(slots[0]).toBe('2026-06-01T09:00:00.000Z');
    expect(slots[slots.length - 1]).toBe('2026-06-05T09:30:00.000Z');
  });

  it('skipWeekends false includes Saturday and Sunday (unchanged behavior)', () => {
    const w: EventWindow = {
      dateStart: '2026-06-01',
      dateEnd: '2026-06-07',
      dayStartTime: '09:00',
      dayEndTime: '10:00',
      authorTimezone: 'UTC',
      skipWeekends: false,
    };
    const slots = generateSlots(w);
    // 1 hour/day = 2 slots/day, 7 days = 14 slots
    expect(slots).toHaveLength(14);
  });
});

describe('validateEventWindow', () => {
  const base: EventWindow = {
    dateStart: '2026-06-01',
    dateEnd: '2026-06-01',
    dayStartTime: '09:00',
    dayEndTime: '18:00',
    authorTimezone: 'UTC',
    skipWeekends: false,
  };

  it('accepts a valid window', () => {
    expect(() => validateEventWindow(base)).not.toThrow();
  });

  it('accepts a window spanning exactly 31 days', () => {
    expect(() => validateEventWindow({ ...base, dateStart: '2026-01-01', dateEnd: '2026-01-31' })).not.toThrow();
  });

  it('rejects a malformed dateStart', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dateStart: '2026/06/01' }));
  });

  it('rejects a malformed dateEnd', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dateEnd: 'June 1' }));
  });

  it('rejects a malformed dayStartTime', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dayStartTime: '9:00' }));
  });

  it('rejects a malformed dayEndTime', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dayEndTime: '18:00:00' }));
  });

  it('rejects a calendar date that does not exist', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dateStart: '2026-02-30', dateEnd: '2026-02-30' }));
  });

  it('rejects dateEnd before dateStart', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dateStart: '2026-06-05', dateEnd: '2026-06-01' }));
  });

  it('rejects a span greater than 31 days', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dateStart: '2026-01-01', dateEnd: '2026-02-05' }));
  });

  it('rejects dayEndTime equal to dayStartTime', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dayStartTime: '09:00', dayEndTime: '09:00' }));
  });

  it('rejects dayEndTime before dayStartTime', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, dayStartTime: '18:00', dayEndTime: '09:00' }));
  });

  it('rejects an unknown time zone', () => {
    expectInvalidAnswer(() => validateEventWindow({ ...base, authorTimezone: 'Not/AZone' }));
  });

  it('rejects a Saturday-Sunday-only window when skipWeekends is true', () => {
    // 2026-06-06 (Sat) .. 2026-06-07 (Sun): weekend only.
    expectInvalidAnswer(() =>
      validateEventWindow({ ...base, dateStart: '2026-06-06', dateEnd: '2026-06-07', skipWeekends: true }),
    );
  });

  it('accepts a Saturday-Sunday-only window when skipWeekends is false', () => {
    expect(() =>
      validateEventWindow({ ...base, dateStart: '2026-06-06', dateEnd: '2026-06-07', skipWeekends: false }),
    ).not.toThrow();
  });
});
