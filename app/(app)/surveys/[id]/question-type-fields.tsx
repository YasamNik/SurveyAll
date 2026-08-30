'use client';

import { useState } from 'react';
import type { QuestionType } from '@/lib/domain/surveys/types';
import { Star } from '@/app/components/stars';

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multi_choice', label: 'Multiple choice' },
  { value: 'free_text', label: 'Free text' },
  { value: 'rating', label: 'Rating' },
];

export function typeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

// Question type + the fields whose relevance depends on it (options for choice
// types, min/max for rating). Server action field names (`type`, `options`,
// `min`, `max`) are unchanged — this only controls what's shown client-side.
export function QuestionTypeFields({
  defaultType,
  locked = false,
  defaultOptions = '',
  optionsRows = 3,
  defaultMin = 1,
  defaultMax = 5,
}: {
  defaultType: QuestionType;
  locked?: boolean;
  defaultOptions?: string;
  optionsRows?: number;
  defaultMin?: number;
  defaultMax?: number;
}) {
  const [type, setType] = useState<QuestionType>(defaultType);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="field-label">Type</span>
        {locked ? (
          <>
            <input type="hidden" name="type" value={defaultType} />
            <span className="text-sm text-pencil flex items-center gap-1">
              {defaultType === 'rating' && <Star filled />}
              {typeLabel(defaultType)} (locked)
            </span>
          </>
        ) : (
          <select
            name="type"
            defaultValue={defaultType}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="field-input"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {(type === 'single_choice' || type === 'multi_choice') && (
        <label className="flex flex-col gap-1">
          <span className="field-label">Options (one per line)</span>
          <textarea name="options" defaultValue={defaultOptions} rows={optionsRows} className="field-input" />
        </label>
      )}

      {type === 'rating' && (
        <div className="flex gap-4">
          <label className="flex flex-col gap-1">
            <span className="field-label">Min</span>
            <input type="number" name="min" defaultValue={defaultMin} className="field-input w-20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">Max</span>
            <input type="number" name="max" defaultValue={defaultMax} className="field-input w-20" />
          </label>
        </div>
      )}
    </>
  );
}
