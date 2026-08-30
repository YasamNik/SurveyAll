// Hand-rolled SVG donut chart for choice-question results (Task B). Server-renderable —
// no client JS. Hover tooltips come from native SVG <title> elements. The ring is
// decorative (aria-hidden); the legend below it is the accessible representation.
// Gaps between slices are unpainted arc — render inside an ancestor with a --card
// background so the gap reads as intentional, not as a rendering artifact.
// Palette + rules: docs/superpowers/specs/2026-08-30-surveyall-visual-design.md

const PALETTE = ['#3D46B2', '#00806A', '#9A6A00', '#A0338A', '#5F7011', '#2E6FB8'];
const TINT_AMOUNT = 0.45; // options 7-12 reuse the palette order, 45%-lighter (mixed toward white)
const MAX_INDIVIDUAL_SLICES = 11; // beyond this, remaining options collapse into "Other"

const SIZE = 160;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2; // px arc length between slices

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function colorForIndex(i: number): string {
  const base = PALETTE[i % PALETTE.length];
  return i < PALETTE.length ? base : tint(base, TINT_AMOUNT);
}

function formatPct(count: number, total: number): string {
  if (total <= 0) return '0%';
  const raw = (count / total) * 100;
  if (raw > 0 && raw < 1) return `${raw.toFixed(1)}%`;
  return `${Math.round(raw)}%`;
}

export interface DonutOption {
  optionId: string;
  label: string;
  count: number;
}

export function DonutChart({ options, multi }: { options: DonutOption[]; multi?: boolean }) {
  // Collapse options beyond MAX_INDIVIDUAL_SLICES into a single "Other" legend/slice entry.
  const legendItems: (DonutOption & { color: string })[] =
    options.length > MAX_INDIVIDUAL_SLICES + 1
      ? [
          ...options.slice(0, MAX_INDIVIDUAL_SLICES).map((o, i) => ({ ...o, color: colorForIndex(i) })),
          {
            optionId: '__other__',
            label: `Other (${options.length - MAX_INDIVIDUAL_SLICES} options)`,
            count: options.slice(MAX_INDIVIDUAL_SLICES).reduce((sum, o) => sum + o.count, 0),
            color: 'var(--pencil)',
          },
        ]
      : options.map((o, i) => ({ ...o, color: colorForIndex(i) }));

  const total = legendItems.reduce((sum, o) => sum + o.count, 0);
  const visible = legendItems.filter((o) => o.count > 0);

  let offset = 0;
  const arcs = visible.map((o) => {
    const rawLength = (o.count / total) * CIRCUMFERENCE;
    // Every count>0 option must stay hoverable/visible — never let a tiny share
    // trim away to a 0-length arc, which would be indistinguishable from a true zero.
    const trimmed = visible.length > 1 ? Math.max(rawLength - GAP, o.count > 0 ? 1 : 0) : rawLength;
    const start = offset + (visible.length > 1 ? GAP / 2 : 0);
    offset += rawLength;
    return { ...o, start, length: trimmed };
  });

  return (
    <div>
      <div className="donut-chart">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="donut-svg" aria-hidden="true">
          {total === 0 ? (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--rule)" strokeWidth={STROKE} />
          ) : (
            arcs.map((arc) => (
              <circle
                key={arc.optionId}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE}
                strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                strokeDashoffset={-arc.start}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              >
                <title>{`${arc.label} — ${arc.count} (${formatPct(arc.count, total)})`}</title>
              </circle>
            ))
          )}
          {total === 0 ? (
            <text x={CENTER} y={CENTER} textAnchor="middle" className="donut-empty-text">
              <tspan x={CENTER} dy="-0.2em">
                No answers
              </tspan>
              <tspan x={CENTER} dy="1.2em">
                yet
              </tspan>
            </text>
          ) : (
            <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="middle" className="donut-total-text">
              {total}
            </text>
          )}
        </svg>

        <ul className="donut-legend">
          {legendItems.map((o) => (
            <li key={o.optionId} className="donut-legend-row">
              <span
                className="donut-swatch"
                style={{ background: o.count > 0 ? o.color : 'transparent', borderColor: o.color }}
              />
              <span className="donut-legend-label">{o.label}</span>
              <span className="donut-legend-count">
                {o.count} ({formatPct(o.count, total)})
              </span>
            </li>
          ))}
        </ul>
      </div>

      {multi && <p className="donut-note">Respondents could pick several — percentages are of selections.</p>}
    </div>
  );
}
