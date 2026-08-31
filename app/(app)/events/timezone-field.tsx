'use client';

import { useState, useSyncExternalStore } from 'react';

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

// Same reasoning as SharePanel's origin handling: the detected zone never
// changes after mount, so there's nothing to subscribe to — this just reads
// it as the client snapshot while falling back to '' on the server (avoiding
// a hydration mismatch).
function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return '';
}

// Intl.supportedValuesOf is missing in some older environments — fall back to
// a plain text input rather than an empty, unusable <select>.
function supportedTimezones(): string[] {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  if (!supportedValuesOf) return [];
  try {
    return supportedValuesOf('timeZone');
  } catch {
    return [];
  }
}

// Detects the browser's time zone and submits it via a hidden input.
// "Change" swaps to an editable <select> (or text input, if the environment
// lacks Intl.supportedValuesOf) with the same field name, so the form only
// ever has one authorTimezone value. `defaultValue` (e.g. a zone re-submitted
// after a failed form action) starts the field open in the changed state when
// it differs from the auto-detected zone, so a prior manual choice survives.
export function TimezoneField({ name = 'authorTimezone', defaultValue }: { name?: string; defaultValue?: string }) {
  const detected = useSyncExternalStore(subscribe, detectTimezone, getServerSnapshot);
  const initial = defaultValue || detected;
  const [changing, setChanging] = useState(Boolean(defaultValue) && defaultValue !== detected);

  const zones = supportedTimezones();

  return (
    <label className="flex flex-col gap-1">
      <span className="field-label">Time zone</span>
      {changing ? (
        zones.length > 0 ? (
          <select name={name} defaultValue={initial} required className="field-input">
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        ) : (
          <input type="text" name={name} defaultValue={initial} required className="field-input" />
        )
      ) : (
        <div className="flex items-center gap-3">
          <input type="hidden" name={name} value={detected} />
          <span className="text-sm">{detected || 'Detecting…'}</span>
          <button type="button" onClick={() => setChanging(true)} className="btn-link text-sm">
            Change
          </button>
        </div>
      )}
    </label>
  );
}
