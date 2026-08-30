'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  HEATMAP_GREENS,
  LONG_PRESS_MS,
  dayKeyOf,
  dayLabelOf,
  dayLabelShortOf,
  exceedsTouchSlop,
  heatmapBg,
  timeKeyOf,
} from './grid-locale';

type HeatmapSlot = { slot: string; count: number; names: string[] };
type Heatmap = { participantCount: number; slots: HeatmapSlot[] };

const FRIENDLY_ERROR: Record<string, string> = {
  RATE_LIMITED: 'Too many attempts from this connection. Try again in a minute.',
  SURVEY_CLOSED: 'This event closed while you were painting. Your changes were not saved.',
  NOT_FOUND: 'You are not joined to this event. Refresh the page and join again.',
};

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
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragModeRef = useRef<'add' | 'erase' | null>(null);

  // Touch-only gesture disambiguation (paint mode): a touch doesn't start
  // painting immediately — it arms a long-press timer so a swipe can still
  // scroll the page. `paintingRef` gates the non-passive touchmove listener
  // below (it can only preventDefault — and so block scroll — once a hold has
  // actually turned into painting). `longPressRef` tracks the pending hold.
  const paintingRef = useRef(false);
  const longPressRef = useRef<{
    pointerId: number;
    iso: string;
    startX: number;
    startY: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const { days, times, cellByKey } = useMemo(() => {
    const dayMap = new Map<string, { dayLabel: string; dayLabelShort: string }>();
    const timeSet = new Set<string>();
    const byKey = new Map<string, string>();

    for (const iso of slots) {
      const d = new Date(iso);
      const dayKey = dayKeyOf(d);
      const timeKey = timeKeyOf(d);
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, { dayLabel: dayLabelOf(d), dayLabelShort: dayLabelShortOf(d) });
      timeSet.add(timeKey);
      byKey.set(`${dayKey}|${timeKey}`, iso);
    }

    const sortedDays = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, labels]) => ({ dayKey, ...labels }));
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

  // The grid div can unmount/remount (the "no availability yet" heatmap empty
  // state replaces it entirely), so the non-passive touchmove listener is
  // attached via a callback ref rather than a mount-only effect — that keeps
  // it correctly attached across those swaps instead of only firing once.
  const setGridRef = useCallback((node: HTMLDivElement | null) => {
    gridRef.current = node;
    if (!node) return;
    // React's pointer/touch handlers are passive by default, so preventDefault
    // has to happen on a manually-attached, non-passive touchmove listener.
    // It only blocks the browser's native scroll once a hold has turned into
    // painting (paintingRef) — before that, touchmove is left alone so a
    // swipe scrolls normally.
    function onTouchMove(e: TouchEvent) {
      if (paintingRef.current) e.preventDefault();
    }
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => node.removeEventListener('touchmove', onTouchMove);
  }, []);

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }

  // Shared by mouse/pen (immediate) and touch (after the long-press fires):
  // decide add-vs-erase from the starting cell, capture the pointer, apply it.
  function beginPaintDrag(iso: string, pointerId: number) {
    const startMode: 'add' | 'erase' = painted.has(iso) ? 'erase' : 'add';
    dragModeRef.current = startMode;
    try {
      gridRef.current?.setPointerCapture(pointerId);
    } catch {
      // The pointer may no longer be active (e.g. a cancel raced the
      // long-press timer) — painting still works via elementFromPoint
      // hit-testing in handlePointerMove even without capture.
    }
    applyPaint(iso, startMode);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (effectiveMode !== 'paint') return;
    const iso = isoFromElement(e.target as Element);
    if (!iso) return;

    if (e.pointerType !== 'touch') {
      // Mouse/pen: unchanged immediate drag-paint.
      e.preventDefault();
      beginPaintDrag(iso, e.pointerId);
      return;
    }

    // Touch: don't paint yet — a swipe on this cell should scroll the page.
    // Arm a long-press timer; if the finger is still within slop when it
    // fires, that's a hold, and painting starts then (see the timer body).
    const { pointerId, clientX, clientY } = e;
    clearLongPress();
    longPressRef.current = {
      pointerId,
      iso,
      startX: clientX,
      startY: clientY,
      timer: setTimeout(() => {
        if (!longPressRef.current || longPressRef.current.pointerId !== pointerId) return;
        longPressRef.current = null;
        paintingRef.current = true;
        beginPaintDrag(iso, pointerId);
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS),
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (effectiveMode !== 'paint') return;

    const pending = longPressRef.current;
    if (pending && pending.pointerId === e.pointerId) {
      // Still waiting on the hold: if the finger has wandered past the slop,
      // this is a scroll, not a paint — drop the timer and let the browser
      // handle it (a pointercancel typically follows; state is already clear).
      if (exceedsTouchSlop(e.clientX - pending.startX, e.clientY - pending.startY)) {
        clearLongPress();
      }
      return;
    }

    if (!dragModeRef.current) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const iso = isoFromElement(target);
    if (iso) applyPaint(iso, dragModeRef.current);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const pending = longPressRef.current;
    if (pending && pending.pointerId === e.pointerId) {
      // Lifted before the long-press fired: a plain tap — toggle the cell.
      // (The subsequent native `click` this produces is ignored by
      // handleCellKeyboardClick's e.detail check below, so this can't
      // double-toggle.)
      clearLongPress();
      applyPaint(pending.iso, painted.has(pending.iso) ? 'erase' : 'add');
    }
    paintingRef.current = false;
    dragModeRef.current = null;
    try {
      gridRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // capture may already have been released (e.g. pointercancel) — no-op.
    }
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    clearLongPress();
    paintingRef.current = false;
    dragModeRef.current = null;
    try {
      gridRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // capture may already have been released — no-op.
    }
  }

  function handleCellKeyboardClick(e: React.MouseEvent<HTMLButtonElement>, iso: string) {
    if (effectiveMode !== 'paint') return;
    // e.detail === 0 marks a keyboard-triggered click (Enter/Space); real pointer
    // taps/clicks are already handled above (mouse: pointerdown; touch: a tap
    // resolved in handlePointerUp before the long-press timer fires), so skip
    // those here to avoid double-toggling.
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
      setSaveError((code && FRIENDLY_ERROR[code]) ?? body?.message ?? 'Something went wrong. Try again.');
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
        <div className="mode-toggle-bar">
          <div className="mode-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className="mode-toggle-btn"
              aria-pressed={effectiveMode === 'paint'}
              onClick={() => setMode('paint')}
            >
              Paint mine
            </button>
            <button
              type="button"
              className="mode-toggle-btn"
              aria-pressed={effectiveMode === 'heatmap'}
              onClick={() => setMode('heatmap')}
            >
              Group heatmap
            </button>
          </div>
        </div>
      )}

      {effectiveMode === 'heatmap' && participantCount === 0 ? (
        <div className="card p-6">
          <p className="text-pencil">No availability yet — share the link.</p>
        </div>
      ) : (
        <div className="avail-scroll">
          <div
            ref={setGridRef}
            className="avail-grid"
            style={{ gridTemplateColumns: `auto repeat(${days.length}, min-content)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className="avail-corner" />
            {days.map((day) => (
              <div key={day.dayKey} className="avail-day-header">
                <span className="sm:hidden">{day.dayLabelShort}</span>
                <span className="hidden sm:inline">{day.dayLabel}</span>
              </div>
            ))}

            {times.map((time) => (
              <Fragment key={time}>
                <div className="avail-time-label">
                  <span className={time.endsWith(':00') ? '' : 'hidden sm:inline'}>{time}</span>
                </div>
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
          <span className="avail-legend-swatch" style={{ backgroundColor: HEATMAP_GREENS[0] }} />
          <span className="avail-legend-swatch" style={{ backgroundColor: HEATMAP_GREENS[1] }} />
          <span className="avail-legend-swatch" style={{ backgroundColor: HEATMAP_GREENS[2] }} />
          <span className="avail-legend-swatch" style={{ backgroundColor: HEATMAP_GREENS[3] }} />
          <span>everyone available</span>
        </div>
      )}

      {effectiveMode === 'paint' && (
        <>
          <p className="avail-touch-hint text-pencil text-sm">Tap to toggle · hold, then drag to paint</p>
          <div className="avail-actions flex flex-col gap-2">
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
        </>
      )}
    </section>
  );
}
