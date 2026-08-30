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

/** Compact day label for narrow (mobile) headers — weekday + day, no month, e.g. "Mon 31". */
export function dayLabelShortOf(d: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    timeZone,
  }).formatToParts(d);
  return `${partValue(parts, 'weekday')} ${partValue(parts, 'day')}`;
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

// Sequential green ramp, pale -> "everyone available". Solid (opaque) colors so
// the banding reads identically over --paper or --card, unlike an alpha tint.
// Anchored around #1B7A43 for the top (full-match) step, which carries a
// ~5.1:1 contrast ratio against --paper (#FAFAF7) — comfortably over the 3:1 floor.
export const HEATMAP_GREENS = ['#D6EEDB', '#9FD6AE', '#57AE71', '#1B7A43'] as const;

/**
 * Which of the 4 non-zero heatmap steps a count/participantCount ratio falls
 * into, or null for 0. The top step (index 3, deepest green) is reserved for
 * a full match — count === participantCount — so "everyone available" is
 * unambiguous; a near-full but partial slot (e.g. 4 of 5) bands into step 2,
 * never the top step.
 */
export function heatmapStep(count: number, participantCount: number): number | null {
  if (count <= 0 || participantCount <= 0) return null;
  if (count >= participantCount) return 3;
  const ratio = count / participantCount;
  return ratio <= 1 / 3 ? 0 : ratio <= 2 / 3 ? 1 : 2;
}

export function heatmapBg(count: number, participantCount: number): string | undefined {
  const step = heatmapStep(count, participantCount);
  if (step === null) return undefined;
  return HEATMAP_GREENS[step];
}
