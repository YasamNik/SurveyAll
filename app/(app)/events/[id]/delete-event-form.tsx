'use client';

import { useState } from 'react';

// Destructive action, no JS dialogs: first click reveals a warning and a
// second, explicit confirm button rather than window.confirm().
export function DeleteEventForm({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn btn-flag">
        Delete event
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <p role="alert" className="error-strip">
        Really delete? This removes all availability.
      </p>
      <div className="flex gap-3">
        <button type="submit" className="btn btn-flag">
          Confirm delete
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
