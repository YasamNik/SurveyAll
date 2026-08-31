import Link from 'next/link';
import { countParticipants, listEvents } from '@/lib/db/queries/events';
import { CreateEventForm } from './create-event-form';

export const dynamic = 'force-dynamic';

const STATUS_CHIP: Record<string, string> = {
  open: 'chip-published',
  closed: 'chip-closed',
};

export default async function EventsPage() {
  const events = await listEvents();
  const counts = await Promise.all(events.map((e) => countParticipants(e.id)));

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-10">
      <h1 className="font-display font-bold text-[28px]">Events</h1>

      <CreateEventForm />

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
