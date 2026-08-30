'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionWithOptions } from '@/lib/domain/surveys/types';

type AnswerValue = string | string[] | number;

function ratingValues(q: QuestionWithOptions): number[] {
  const min = q.config?.min ?? 1;
  const max = q.config?.max ?? 5;
  const values: number[] = [];
  for (let v = min; v <= max; v++) values.push(v);
  return values;
}

export function RespondForm({
  survey,
  questions,
}: {
  survey: { slug: string };
  questions: QuestionWithOptions[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const answers: Record<string, AnswerValue> = {};

    for (const q of questions) {
      if (q.type === 'multi_choice') {
        const values = formData.getAll(q.id).map(String);
        if (values.length > 0) answers[q.id] = values;
      } else if (q.type === 'rating') {
        const raw = formData.get(q.id);
        if (raw !== null && raw !== '') answers[q.id] = Number(raw);
      } else {
        const raw = formData.get(q.id);
        if (raw !== null && raw !== '') answers[q.id] = String(raw);
      }
    }

    const missingRequired = questions.find((q) => q.required && !(q.id in answers));
    if (missingRequired) {
      setError(`"${missingRequired.prompt}" is required.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/public/surveys/${survey.slug}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.status === 201) {
        router.push(`/s/${survey.slug}/done`);
        return;
      }

      const body: { error?: string; message?: string } | null = await res.json().catch(() => null);
      setError(body?.message ?? body?.error ?? 'Something went wrong. Please try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {questions.map((q) => (
        <fieldset key={q.id} className="border border-gray-300 rounded p-4">
          <legend className="font-medium px-1">
            {q.prompt}
            {q.required && (
              <span className="text-red-600" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </legend>

          {q.type === 'single_choice' && (
            <div className="flex flex-col gap-2 mt-2">
              {q.options.map((o) => (
                <label key={o.id} htmlFor={`${q.id}-${o.id}`} className="flex items-center gap-2">
                  <input type="radio" id={`${q.id}-${o.id}`} name={q.id} value={o.id} required={q.required} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'multi_choice' && (
            <div className="flex flex-col gap-2 mt-2">
              {q.options.map((o) => (
                <label key={o.id} htmlFor={`${q.id}-${o.id}`} className="flex items-center gap-2">
                  <input type="checkbox" id={`${q.id}-${o.id}`} name={q.id} value={o.id} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'free_text' && (
            <div className="mt-2">
              <label htmlFor={q.id} className="sr-only">
                {q.prompt}
              </label>
              <textarea
                id={q.id}
                name={q.id}
                required={q.required}
                rows={3}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          )}

          {q.type === 'rating' && (
            <div className="flex gap-2 mt-2">
              {ratingValues(q).map((v) => (
                <label key={v} htmlFor={`${q.id}-${v}`} className="cursor-pointer">
                  <input type="radio" id={`${q.id}-${v}`} name={q.id} value={v} required={q.required} className="peer sr-only" />
                  <span className="inline-block border rounded px-3 py-1 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400">
                    {v}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
