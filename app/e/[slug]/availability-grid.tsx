'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type HeatmapSlot = { slot: string; count: number; names: string[] };
type Heatmap = { participantCount: number; slots: HeatmapSlot[] };

const FRIENDLY_ERROR: Record<string, string> = {
  RATE_LIMITED: 'Too many attempts from this connection. Try again in a minute.',
  SURVEY_CLOSED: 'This event closed while you were painting. Your changes were not saved.',
  NOT_FOUND: 'You are not joined to this event. Refresh the page and join again.',
};

const STAMP_TINTS = [0.15, 0.35, 0.6, 1.0];

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? '';
}

function dayKeyOf(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    d,
  );
  return `${partValue(parts, 'year')}-${partValue(parts, 'month')}-${partValue(parts, 'day')}`;
}

function dayLabelOf(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).formatToParts(
    d,
  );
  return `${partValue(parts, 'weekday')} ${partValue(parts, 'month')} ${partValue(parts, 'day')}`;
}

function timeKeyOf(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(
    d,
  );
  let hour = partValue(parts, 'hour');
  if (hour === '24') hour = '00';
  return `${hour}:${partValue(parts, 'minute')}`;
}

function heatmapBg(count: number, participantCount: number): string | undefined {
  if (count <= 0 || participantCount <= 0) return undefined;
  const ratio = count / participantCount;
  const idx = ratio <= 0.25 ? 0 : ratio <= 0.5 ? 1 : ratio <= 0.75 ? 2 : 3;
  return `rgba(61, 70, 178, ${STAMP_TINTS[idx]})`;
}

export function AvailabilityGrid({
  slots,
  heatmap,
  participantCount,
  mySlots,
  joined,
  open,
  myName,
}: {
  slots: string[];
  heatmap: Heatmap;
  participantCount: number;
  mySlots: string[];
  joined: boolean;
  open: boolean;
  myName?: string;
}) {
  const router = useRouter();
  // The slug isn't in this component's props (the binding contract fixes them to
  // {slots, heatmap, participantCount, mySlots, joined, open, myName}), but this
  // page always lives at /e/[slug], so it's read from the URL.
  const pathname = usePathname();
  const slug = pathname.split('/').filter(Boolean).pop() ?? '';
  const canPaint = joined && open;

  const [mode, setMode] = useState<'paint' | 'heatmap'>(canPaint ? 'paint' : 'heatmap');
  const effectiveMode = canPaint ? mode : 'heatmap';

  const [painted, setPainted] = useState<Set<string>>(() => new Set(mySlots));
  const [savedSlots, setSavedSlots] = useState<Set<string>>(() => new Set(mySlots));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [popover, setPopover] = useState<{ iso: string; top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragModeRef = useRef<'add' | 'erase' | null>(null);

  const { days, times, cellByKey } = useMemo(() => {
    const dayMap = new Map<string, string>();
    const timeSet = new Set<string>();
    const byKey = new Map<string, string>();

    for (const iso of slots) {
      const d = new Date(iso);
      const dayKey = dayKeyOf(d);
      const timeKey = timeKeyOf(d);
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, dayLabelOf(d));
      timeSet.add(timeKey);
      byKey.set(`${dayKey}|${timeKey}`, iso);
    }

    const sortedDays = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, dayLabel]) => ({ dayKey, dayLabel }));
    const sortedTimes = Array.from(timeSet).sort();

    return { days: sortedDays, times: sortedTimes, cellByKey: byKey };
  }, [slots]);

  const heatmapByIso = useMemo(() => new Map(heatmap.slots.map((s) => [s.slot, s])), [heatmap.slots]);

  const dirty = useMemo(() => {
    if (painted.size !== savedSlots.size) return true;
    for (const iso of painted) if (!savedSlots.has(iso)) return true;
    return false;
  }, [painted, savedSlots]);

  useEffect(() => {
    if (!popover) return;
    function onPointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopover(null);
    }
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [popover]);

  function isoFromElement(el: Element | null): string | null {
    if (!el) return null;
    const cellEl = el.closest('[data-iso]');
    return cellEl instanceof HTMLElement ? (cellEl.dataset.iso ?? null) : null;
  }

  function applyPaint(iso: string, paintMode: 'add' | 'erase') {
    setPainted((prev) => {
      const has = prev.has(iso);
      if (paintMode === 'add' && has) return prev;
      if (paintMode === 'erase' && !has) return prev;
      const next = new Set(prev);
      if (paintMode === 'add') next.add(iso);
      else next.delete(iso);
      return next;
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (effectiveMode !== 'paint') return;
    const iso = isoFromElement(e.target as Element);
    if (!iso) return;
    e.preventDefault();
    const startMode: 'add' | 'erase' = painted.has(iso) ? 'erase' : 'add';
    dragModeRef.current = startMode;
    gridRef.current?.setPointerCapture(e.pointerId);
    applyPaint(iso, startMode);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (effectiveMode !== 'paint' || !dragModeRef.current) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const iso = isoFromElement(target);
    if (iso) applyPaint(iso, dragModeRef.current);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragModeRef.current = null;
    try {
      gridRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // capture may already have been released (e.g. pointercancel) — no-op.
    }
  }

  function handleCellKeyboardClick(e: React.MouseEvent<HTMLButtonElement>, iso: string) {
    if (effectiveMode !== 'paint') return;
    // e.detail === 0 marks a keyboard-triggered click (Enter/Space); real pointer
    // taps are already handled by pointerdown above, so skip those here to avoid
    // double-toggling.
    if (e.detail !== 0) return;
    applyPaint(iso, painted.has(iso) ? 'erase' : 'add');
  }

  function handleHeatmapCellClick(e: React.MouseEvent<HTMLButtonElement>, iso: string) {
    const cellEl = e.currentTarget;
    setPopover({ iso, top: cellEl.offsetTop + cellEl.offsetHeight + 6, left: cellEl.offsetLeft });
  }

  async function handleSave() {
    setSaveState('saving');
    setSaveError(null);
    try {
      const res = await fetch(`/api/v1/public/events/${slug}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: Array.from(painted) }),
      });

      if (res.ok) {
        setSavedSlots(new Set(painted));
        setSaveState('saved');
        router.refresh();
        return;
      }

      const body: { error?: string; message?: string } | null = await res.json().catch(() => null);
      const code = body?.error;
      setSaveError(body?.message ?? (code && FRIENDLY_ERROR[code]) ?? 'Something went wrong. Try again.');
      setSaveState('error');
    } catch {
      setSaveError('Network error. Try again.');
      setSaveState('error');
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {joined && myName && <p className="text-pencil text-sm">Joined as {myName}</p>}

      {canPaint && (
        <div className="flex gap-2" role="group" aria-label="View mode">
          <button
            type="button"
            className="btn btn-secondary"
            aria-pressed={effectiveMode === 'paint'}
            onClick={() => setMode('paint')}
          >
            Paint mine
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            aria-pressed={effectiveMode === 'heatmap'}
            onClick={() => setMode('heatmap')}
          >
            Group heatmap
          </button>
        </div>
      )}

      {effectiveMode === 'heatmap' && participantCount === 0 ? (
        <div className="card p-6">
          <p className="text-pencil">No availability yet — share the link.</p>
        </div>
      ) : (
        <div className="avail-scroll">
          <div
            ref={gridRef}
            className="avail-grid"
            style={{ gridTemplateColumns: `auto repeat(${days.length}, min-content)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="avail-corner" />
            {days.map((day) => (
              <div key={day.dayKey} className="avail-day-header">
                {day.dayLabel}
              </div>
            ))}

            {times.map((time) => (
              <Fragment key={time}>
                <div className="avail-time-label">{time}</div>
                {days.map((day) => {
                  const iso = cellByKey.get(`${day.dayKey}|${time}`);
                  if (!iso) return <div key={day.dayKey} className="avail-cell-empty" />;

                  if (effectiveMode === 'paint') {
                    const selected = painted.has(iso);
                    return (
                      <button
                        key={iso}
                        type="button"
                        data-iso={iso}
                        className={`avail-cell${selected ? ' is-painted' : ''}`}
                        aria-label={`${day.dayLabel}, ${time} — ${selected ? 'selected' : 'not selected'}`}
                        onClick={(e) => handleCellKeyboardClick(e, iso)}
                      />
                    );
                  }

                  const heat = heatmapByIso.get(iso);
                  const count = heat?.count ?? 0;
                  return (
                    <button
                      key={iso}
                      type="button"
                      data-iso={iso}
                      className="avail-cell"
                      style={{ backgroundColor: heatmapBg(count, participantCount) }}
                      aria-label={`${day.dayLabel}, ${time} — ${count} of ${participantCount} available`}
                      onClick={(e) => handleHeatmapCellClick(e, iso)}
                    />
                  );
                })}
              </Fragment>
            ))}

            {popover &&
              (() => {
                const heat = heatmapByIso.get(popover.iso);
                const names = heat?.names ?? [];
                return (
                  <div
                    ref={popoverRef}
                    className="avail-popover"
                    style={{ top: popover.top, left: popover.left }}
                    role="group"
                    aria-label="Who is available"
                  >
                    <button type="button" className="avail-popover-close" onClick={() => setPopover(null)} aria-label="Close">
                      ×
                    </button>
                    {names.length > 0 ? (
                      <ul>
                        {names.map((n, i) => (
                          <li key={`${n}-${i}`}>{n}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-pencil text-sm">No one yet.</p>
                    )}
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {effectiveMode === 'heatmap' && participantCount > 0 && (
        <div className="avail-legend">
          <span>0</span>
          <span className="avail-legend-swatch avail-legend-swatch-0" />
          <span className="avail-legend-swatch" style={{ backgroundColor: `rgba(61, 70, 178, ${STAMP_TINTS[0]})` }} />
          <span className="avail-legend-swatch" style={{ backgroundColor: `rgba(61, 70, 178, ${STAMP_TINTS[1]})` }} />
          <span className="avail-legend-swatch" style={{ backgroundColor: `rgba(61, 70, 178, ${STAMP_TINTS[2]})` }} />
          <span className="avail-legend-swatch" style={{ backgroundColor: `rgba(61, 70, 178, ${STAMP_TINTS[3]})` }} />
          <span>all available</span>
        </div>
      )}

      {effectiveMode === 'paint' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saveState === 'saving' || !dirty}
              onClick={handleSave}
            >
              {saveState === 'saving' ? 'Saving…' : 'Save availability'}
            </button>
            {dirty && <span className="text-pencil text-sm">Unsaved changes</span>}
            {!dirty && saveState === 'saved' && <span className="text-stamp text-sm">Saved ✓</span>}
          </div>
          {saveState === 'error' && saveError && (
            <p role="alert" className="error-strip">
              {saveError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
