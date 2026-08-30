import { DomainError } from '../shared/errors';

/**
 * Converts a wall-clock date+time in the given IANA time zone to the UTC instant
 * it represents, using the Intl double-conversion technique (no dependencies).
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  assertValidTimeZone(timeZone);

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const t0 = Date.UTC(year, month - 1, day, hour, minute);

  const offset1 = wallClockOffset(t0, timeZone);
  const candidate1 = t0 - offset1;
  const offset2 = wallClockOffset(candidate1, timeZone);
  const finalCandidate = offset2 === offset1 ? candidate1 : t0 - offset2;

  return new Date(finalCandidate);
}

function assertValidTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new DomainError('INVALID_ANSWER', 'unknown time zone');
  }
}

/** Offset (ms) such that localWallClock = instant + offset, for the given zone at the given instant. */
function wallClockOffset(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(instantMs));

  const value: Record<string, string> = {};
  for (const part of parts) value[part.type] = part.value;

  let hour = Number(value.hour);
  if (hour === 24) hour = 0; // some environments format midnight as "24"

  const wallAsUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    hour,
    Number(value.minute),
    Number(value.second),
  );

  return wallAsUtc - instantMs;
}
