'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FRIENDLY_ERROR: Record<string, string> = {
  RATE_LIMITED: 'Too many attempts from this connection. Try again in a minute.',
};

export function JoinForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const displayName = String(formData.get('displayName') ?? '').trim();
    if (displayName.length === 0 || displayName.length > 100) {
      setError('Name must be 1–100 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/public/events/${slug}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      if (res.status === 201) {
        router.refresh();
        return;
      }

      const body: { error?: string; message?: string } | null = await res.json().catch(() => null);
      const code = body?.error;
      setError((code && FRIENDLY_ERROR[code]) ?? body?.message ?? 'Something went wrong. Try again.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
      {error && (
        <p role="alert" className="error-strip">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1">
        <span className="field-label">Your name</span>
        <input
          type="text"
          name="displayName"
          minLength={1}
          maxLength={100}
          required
          className="field-input"
        />
      </label>
      <button type="submit" disabled={submitting} className="btn btn-primary self-start">
        {submitting ? 'Joining…' : 'Join event'}
      </button>
    </form>
  );
}
