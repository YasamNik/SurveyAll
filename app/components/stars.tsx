// Presentational star iconography — Paper Ballot rating mark.
// Used by the respond-form star input, the editor's rating type glyph, and
// (Task B) results star average/mini-chart. Pure SVG, no icon library.

const STAR_PATH =
  'M12 2.75l2.94 6.06 6.56.79-4.86 4.62 1.28 6.55L12 17.5l-5.92 3.27 1.28-6.55-4.86-4.62 6.56-.79z';

export function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
      className="star-icon"
    >
      <path d={STAR_PATH} className="star-icon-path" fill={filled ? 'var(--stamp)' : 'none'} stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  );
}

export function Stars({ value, max }: { value: number; max: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} filled={i < value} />
      ))}
    </span>
  );
}
