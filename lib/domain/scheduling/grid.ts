import { DomainError } from '../shared/errors';
import { zonedTimeToUtc } from './timezone';

export interface EventWindow {
  dateStart: string;
  dateEnd: string;
  dayStartTime: string;
  dayEndTime: string;
  authorTimezone: string;
  skipWeekends: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MS_PER_DAY = 86_400_000;
const SLOT_STEP_MINUTES = 30;

export function validateEventWindow(w: EventWindow): void {
  if (!DATE_RE.test(w.dateStart) || !isRealDate(w.dateStart)) {
    throw new DomainError('INVALID_ANSWER', 'Enter dates as YYYY-MM-DD');
  }
  if (!DATE_RE.test(w.dateEnd) || !isRealDate(w.dateEnd)) {
    throw new DomainError('INVALID_ANSWER', 'Enter dates as YYYY-MM-DD');
  }
  if (!TIME_RE.test(w.dayStartTime)) {
    throw new DomainError('INVALID_ANSWER', 'Enter times as HH:MM');
  }
  if (!TIME_RE.test(w.dayEndTime)) {
    throw new DomainError('INVALID_ANSWER', 'Enter times as HH:MM');
  }

  const startMs = parseDateUtc(w.dateStart);
  const endMs = parseDateUtc(w.dateEnd);
  if (endMs < startMs) {
    throw new DomainError('INVALID_ANSWER', 'End date must not be before the start date');
  }
  const spanDays = (endMs - startMs) / MS_PER_DAY + 1;
  if (spanDays > 31) {
    throw new DomainError('INVALID_ANSWER', 'Event can span at most 31 days');
  }

  if (w.dayEndTime <= w.dayStartTime) {
    throw new DomainError('INVALID_ANSWER', 'Daily end time must be after the daily start time');
  }

  // Validates the time zone as a side effect (throws INVALID_ANSWER 'unknown time zone').
  zonedTimeToUtc(w.dateStart, w.dayStartTime, w.authorTimezone);

  if (effectiveDates(w).length === 0) {
    throw new DomainError(
      'INVALID_ANSWER',
      'This date range has only weekend days — uncheck Skip weekends or widen the range',
    );
  }
}

export function generateSlots(w: EventWindow): string[] {
  validateEventWindow(w);

  const slots: string[] = [];
  for (const date of effectiveDates(w)) {
    for (const time of dayTimeSteps(w.dayStartTime, w.dayEndTime)) {
      slots.push(zonedTimeToUtc(date, time, w.authorTimezone).toISOString());
    }
  }

  return Array.from(new Set(slots)).sort();
}

// Day-of-week check on the calendar date string itself (pure UTC math), not on the
// zoned instant the slot resolves to — the author's calendar date defines the weekend.
function isWeekend(date: string): boolean {
  const day = new Date(parseDateUtc(date)).getUTCDay();
  return day === 0 || day === 6;
}

function effectiveDates(w: Pick<EventWindow, 'dateStart' | 'dateEnd' | 'skipWeekends'>): string[] {
  const dates = enumerateDates(w.dateStart, w.dateEnd);
  return w.skipWeekends ? dates.filter((date) => !isWeekend(date)) : dates;
}

function isRealDate(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parseDateUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatDateUtc(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function enumerateDates(dateStart: string, dateEnd: string): string[] {
  const start = parseDateUtc(dateStart);
  const end = parseDateUtc(dateEnd);
  const dates: string[] = [];
  for (let t = start; t <= end; t += MS_PER_DAY) {
    dates.push(formatDateUtc(t));
  }
  return dates;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dayTimeSteps(dayStartTime: string, dayEndTime: string): string[] {
  const startMin = timeToMinutes(dayStartTime);
  const endMin = timeToMinutes(dayEndTime);
  const times: string[] = [];
  for (let m = startMin; m < endMin; m += SLOT_STEP_MINUTES) {
    times.push(minutesToTime(m));
  }
  return times;
}
