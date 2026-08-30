'use client';

import { useRef, useState } from 'react';

const COPIED_MS = 2000;

export function SharePanel({ url, closed }: { url: string; closed: boolean }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  function showCopied() {
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      showCopied();
    } catch {
      const input = inputRef.current;
      if (input) {
        input.select();
        document.execCommand('copy');
        showCopied();
      }
    }
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
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
