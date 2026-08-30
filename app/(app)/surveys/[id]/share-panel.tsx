'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const STATUS_MS = 2000;

type CopyStatus = 'idle' | 'copied' | 'failed';

// window.location.origin never changes after mount, so there is nothing to
// subscribe to — this just lets us read it as the client snapshot while
// falling back to '' on the server (avoiding a hydration mismatch).
function subscribe() {
  return () => {};
}

function getOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return '';
}

export function SharePanel({ path, closed }: { path: string; closed: boolean }) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const url = origin + path;

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function showStatus(next: CopyStatus) {
    setStatus(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus('idle'), STATUS_MS);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      showStatus('copied');
      return;
    } catch {
      // Older browsers / clipboard-write denied — fall through to the
      // execCommand fallback below rather than assuming success.
    }
    const input = inputRef.current;
    let fallbackOk = false;
    if (input) {
      input.select();
      fallbackOk = document.execCommand('copy');
    }
    showStatus(fallbackOk ? 'copied' : 'failed');
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="field-label">{closed ? 'Public link (closed)' : 'Public link'}</span>
      <div className="flex gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="field-input flex-1 min-w-0 font-mono text-sm"
        />
        <button type="button" onClick={handleCopy} className="btn btn-secondary">
          {status === 'copied' ? 'Copied' : 'Copy link'}
        </button>
        <a href={path} target="_blank" rel="noopener" className="btn btn-secondary">
          Open
        </a>
      </div>
      {status === 'failed' && (
        <p role="alert" className="error-strip">
          Copy failed — select the link and copy manually.
        </p>
      )}
    </div>
  );
}
