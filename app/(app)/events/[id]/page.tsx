import Link from 'next/link';
import { notFound } from 'next/navigation';
import { countParticipants, getEvent } from '@/lib/db/queries/events';
import { SharePanel } from '@/app/(app)/surveys/[id]/share-panel';
import { closeEventAction, deleteEventAction, patchEventAction } from '../actions';
import { DeleteEventForm } from './delete-event-form';

export const dynamic = 'force-dynamic';

const STATUS_CHIP: Record<string, string> = {
  open: 'chip-published',
  closed: 'chip-closed',
};

export default async function EventEditorPage(props: PageProps<'/events/[id]'>) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === 'string' ? searchParams.error : null;
  const section = typeof searchParams.section === 'string' ? searchParams.section : null;

  const event = await getEvent(id);
  if (!event) notFound();

  const isClosed = event.status === 'closed';
  const participantCount = await countParticipants(event.id);
  const publicPath = `/e/${event.slug}`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/events" className="btn-link text-sm">
          &larr; All events
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-bold text-[28px]">{event.title}</h1>
          <span className={`chip ${STATUS_CHIP[event.status]}`}>{event.status}</span>
        </div>
      </div>

      <section className="card p-6 flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold">Details</h2>
        {section === 'details' && error && (
          <p role="alert" className="error-strip">
            {error}
          </p>
        )}
        {isClosed ? (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium">Title:</span> {event.title}
            </p>
            <p>
              <span className="font-medium">Description:</span> {event.description || '—'}
            </p>
          </div>
        ) : (
          <form action={patchEventAction.bind(null, event.id)} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="field-label">Title</span>
              <input type="text" name="title" defaultValue={event.title} required className="field-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="field-label">Description</span>
              <textarea
                name="description"
                defaultValue={event.description ?? ''}
                rows={2}
                className="field-input"
              />
            </label>
            <button type="submit" className="btn btn-primary self-start">
              Save changes
            </button>
          </form>
        )}

        <div className="tear-line pt-4 flex flex-col gap-1 text-sm">
          <p className="field-label">Event window (fixed after creation)</p>
          <p>
            <span className="font-medium">Dates:</span> {event.dateStart} to {event.dateEnd}
          </p>
          <p>
            <span className="font-medium">Daily window:</span> {event.dayStartTime}–{event.dayEndTime}
          </p>
          <p>
            <span className="font-medium">Time zone:</span> {event.authorTimezone}
          </p>
        </div>
      </section>

      <section className="card p-6 flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold">Status</h2>
        {section === 'status' && error && (
          <p role="alert" className="error-strip">
            {error}
          </p>
        )}
        <p className="font-mono text-sm text-pencil">
          {participantCount} participant{participantCount === 1 ? '' : 's'}
        </p>

        <SharePanel path={publicPath} closed={isClosed} />

        <p className="text-sm">
          <Link href={publicPath} className="btn-link">
            View availability
          </Link>
        </p>

        {!isClosed && (
          <form action={closeEventAction.bind(null, event.id)}>
            <button type="submit" className="btn btn-flag">
              Close event
            </button>
          </form>
        )}

        <div className="tear-line pt-4">
          <DeleteEventForm action={deleteEventAction.bind(null, event.id)} />
        </div>
      </section>
    </main>
  );
}
