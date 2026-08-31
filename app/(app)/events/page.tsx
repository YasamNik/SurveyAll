import Link from 'next/link';
import { countParticipants, listEvents } from '@/lib/db/queries/events';
import { createEventAction } from './actions';
import { TimezoneField } from './timezone-field';

export const dynamic = 'force-dynamic';

const STATUS_CHIP: Record<string, string> = {
  open: 'chip-published',
  closed: 'chip-closed',
};

export default async function EventsPage(props: PageProps<'/events'>) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === 'string' ? searchParams.error : null;

  const events = await listEvents();
  const counts = await Promise.all(events.map((e) => countParticipants(e.id)));

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-10">
      <h1 className="font-display font-bold text-[28px]">Events</h1>

      <form action={createEventAction} className="card p-6 flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold">New event</h2>
        <label className="flex flex-col gap-1">
          <span className="field-label">Title</span>
          <input type="text" name="title" required className="field-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Description</span>
          <textarea name="description" rows={2} className="field-input" />
        </label>

        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="field-label">Start date</span>
            <input type="date" name="dateStart" required className="field-input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">End date</span>
            <input type="date" name="dateEnd" required className="field-input" />
          </label>
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="field-label">Daily start time</span>
            <input type="time" name="dayStartTime" step={1800} required className="field-input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">Daily end time</span>
            <input type="time" name="dayEndTime" step={1800} required className="field-input" />
          </label>
        </div>

        <TimezoneField />

        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="skipWeekends" defaultChecked className="h-4 w-4" />
            <span>Skip weekends</span>
          </span>
          <span className="text-pencil text-sm">Saturdays and Sundays are left out of the grid</span>
        </label>

        {error && (
          <p role="alert" className="error-strip">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary self-start">
          Create event
        </button>
      </form>

      {events.length === 0 ? (
        <p className="text-pencil">No events yet — create your first one.</p>
      ) : (
        <ul className="flex flex-col">
          {events.map((e, i) => (
            <li key={e.id} className="border-b border-rule py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="font-medium truncate">{e.title}</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`chip ${STATUS_CHIP[e.status]}`}>{e.status}</span>
                  <span className="font-mono text-xs text-pencil">
                    {counts[i]} participant{counts[i] === 1 ? '' : 's'}
                  </span>
                  <span className="font-mono text-xs text-pencil">
                    {e.dateStart} – {e.dateEnd}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Link href={`/events/${e.id}`} className="btn-link text-sm">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
