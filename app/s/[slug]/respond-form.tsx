'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionWithOptions } from '@/lib/domain/surveys/types';
import { Star } from '@/app/components/stars';

type AnswerValue = string | string[] | number;

const FRIENDLY_ERROR: Record<string, string> = {
  RATE_LIMITED: 'Too many submissions from this connection. Try again in a minute.',
};

function ratingValues(q: QuestionWithOptions): number[] {
  const min = q.config?.min ?? 1;
  const max = Math.min(q.config?.max ?? 5, min + 10);
  const values: number[] = [];
  for (let v = min; v <= max; v++) values.push(v);
  return values;
}

function ratingMax(q: QuestionWithOptions): number {
  const values = ratingValues(q);
  return values[values.length - 1];
}

function qNumber(i: number): string {
  return String(i + 1).padStart(2, '0');
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
      const code = body?.error;
      setError(body?.message ?? (code && FRIENDLY_ERROR[code]) ?? 'Something went wrong. Try again.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="error-strip">
          {error}
        </p>
      )}

      {questions.map((q, i) => (
        <fieldset key={q.id} className="card p-6">
          <legend className="flex items-baseline gap-2 px-1 font-medium">
            <span className="q-number">{qNumber(i)}</span>
            <span>
              {q.prompt}
              {q.required && (
                <span className="text-flag" aria-hidden="true">
                  {' '}
                  *
                </span>
              )}
            </span>
          </legend>

          {q.type === 'single_choice' && (
            <div className="flex flex-col gap-3 mt-3">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  htmlFor={`${q.id}-${o.id}`}
                  className="flex items-center gap-3 min-h-11 cursor-pointer"
                >
                  <input
                    type="radio"
                    id={`${q.id}-${o.id}`}
                    name={q.id}
                    value={o.id}
                    required={q.required}
                    className="omr-mark"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'multi_choice' && (
            <div className="flex flex-col gap-3 mt-3">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  htmlFor={`${q.id}-${o.id}`}
                  className="flex items-center gap-3 min-h-11 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id={`${q.id}-${o.id}`}
                    name={q.id}
                    value={o.id}
                    className="omr-mark"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'free_text' && (
            <div className="mt-3">
              <label htmlFor={q.id} className="sr-only">
                {q.prompt}
              </label>
              <textarea id={q.id} name={q.id} required={q.required} rows={3} className="field-input w-full" />
            </div>
          )}

          {q.type === 'rating' && (
            <div className="stars-field mt-3">
              {[...ratingValues(q)].reverse().map((v) => (
                <Fragment key={v}>
                  <input
                    type="radio"
                    id={`${q.id}-${v}`}
                    name={q.id}
                    value={v}
                    required={q.required}
                    aria-label={`${v} of ${ratingMax(q)}`}
                    className="stars-option"
                  />
                  <label htmlFor={`${q.id}-${v}`} className="stars-label">
                    <Star filled={false} />
                  </label>
                </Fragment>
              ))}
            </div>
          )}
        </fieldset>
      ))}

      <button type="submit" disabled={submitting} className="btn btn-primary self-start">
        {submitting ? 'Submitting…' : 'Submit answers'}
      </button>
    </form>
  );
}
