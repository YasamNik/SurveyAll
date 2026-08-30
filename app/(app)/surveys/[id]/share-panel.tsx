'use client';

import { useEffect, useRef, useState } from 'react';

const STATUS_MS = 2000;

type CopyStatus = 'idle' | 'copied' | 'failed';

export function SharePanel({ url, closed }: { url: string; closed: boolean }) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

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
      </div>
      {status === 'failed' && (
        <p role="alert" className="error-strip">
          Copy failed — select the link and copy manually.
        </p>
      )}
    </div>
  );
}
