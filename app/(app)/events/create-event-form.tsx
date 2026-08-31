'use client';

import { useActionState } from 'react';
import { createEventAction, type CreateEventState } from './actions';
import { TimezoneField } from './timezone-field';

const INITIAL_STATE: CreateEventState = {
  error: null,
  values: {
    title: '',
    description: '',
    authorTimezone: '',
    dateStart: '',
    dateEnd: '',
    dayStartTime: '09:00',
    dayEndTime: '17:00',
    skipWeekends: true,
  },
};

// Client component so a failed submission can re-render with the submitted
// values (via useActionState) instead of losing them to a redirect-driven
// navigation, as a plain server-action form would.
export function CreateEventForm() {
  const [state, formAction] = useActionState(createEventAction, INITIAL_STATE);
  const { values } = state;

  return (
    <form action={formAction} className="card p-6 flex flex-col gap-4">
      <h2 className="text-[18px] font-semibold">New event</h2>
      <label className="flex flex-col gap-1">
        <span className="field-label">Title</span>
        <input type="text" name="title" defaultValue={values.title} required className="field-input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="field-label">Description</span>
        <textarea name="description" defaultValue={values.description} rows={2} className="field-input" />
      </label>

      <div className="flex gap-4 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="field-label">Start date</span>
          <input type="date" name="dateStart" defaultValue={values.dateStart} required className="field-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">End date</span>
          <input type="date" name="dateEnd" defaultValue={values.dateEnd} required className="field-input" />
        </label>
      </div>

      <div className="flex gap-4 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="field-label">Daily start time</span>
          <input
            type="time"
            name="dayStartTime"
            step={1800}
            defaultValue={values.dayStartTime}
            required
            className="field-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Daily end time</span>
          <input
            type="time"
            name="dayEndTime"
            step={1800}
            defaultValue={values.dayEndTime}
            required
            className="field-input"
          />
        </label>
      </div>

      <TimezoneField defaultValue={values.authorTimezone} />

      <label className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="skipWeekends" defaultChecked={values.skipWeekends} className="h-4 w-4" />
          <span>Skip weekends</span>
        </span>
        <span className="text-pencil text-sm">Saturdays and Sundays are left out of the grid</span>
      </label>

      {state.error && (
        <p role="alert" className="error-strip">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary self-start">
        Create event
      </button>
    </form>
  );
}
