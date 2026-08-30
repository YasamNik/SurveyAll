// Pure Date -> local-bucket helpers for the availability grid, kept dependency-free
// (no 'use client', no React) so they're both importable from the client component
// and directly unit-testable with a pinned IANA zone. The component itself always
// calls these with no `timeZone` argument — Intl then falls back to the browser's
// own zone, which is what makes the grid render in the VIEWER's local time.

export function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? '';
}

export function dayKeyOf(d: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(d);
  return `${partValue(parts, 'year')}-${partValue(parts, 'month')}-${partValue(parts, 'day')}`;
}

export function dayLabelOf(d: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).formatToParts(d);
  return `${partValue(parts, 'weekday')} ${partValue(parts, 'month')} ${partValue(parts, 'day')}`;
}

export function timeKeyOf(d: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).formatToParts(d);
  let hour = partValue(parts, 'hour');
  // Some environments format local midnight as "24" rather than "00" for
  // hour12: false — clamp it so times sort and match consistently.
  if (hour === '24') hour = '00';
  return `${hour}:${partValue(parts, 'minute')}`;
}

export const STAMP_TINTS = [0.15, 0.35, 0.6, 1.0];

/** Which of the 4 non-zero heatmap tints a count/participantCount ratio falls into, or null for 0. */
export function heatmapStep(count: number, participantCount: number): number | null {
  if (count <= 0 || participantCount <= 0) return null;
  const ratio = count / participantCount;
  return ratio <= 0.25 ? 0 : ratio <= 0.5 ? 1 : ratio <= 0.75 ? 2 : 3;
}

export function heatmapBg(count: number, participantCount: number): string | undefined {
  const step = heatmapStep(count, participantCount);
  if (step === null) return undefined;
  return `rgba(61, 70, 178, ${STAMP_TINTS[step]})`;
}
