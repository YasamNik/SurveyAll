import { notFound } from 'next/navigation';
import { DomainError } from '@/lib/domain/shared/errors';
import { readParticipantToken } from '@/lib/api/participant-cookie';
import {
  getEventIdBySlug,
  getHeatmap,
  getParticipantByToken,
  getParticipantSlots,
  getPublicEventBySlug,
} from '@/lib/db/queries/events';
import { JoinForm } from './join-form';
import { AvailabilityGrid } from './availability-grid';

export const dynamic = 'force-dynamic';

export default async function EventPage(props: PageProps<'/e/[slug]'>) {
  const { slug } = await props.params;

  let event, slots, eventId, heatmap;
  try {
    ({ event, slots } = await getPublicEventBySlug(slug));
    eventId = await getEventIdBySlug(slug);
    heatmap = await getHeatmap(slug);
  } catch (e) {
    if (e instanceof DomainError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  const token = await readParticipantToken(eventId);
  const participant = token ? await getParticipantByToken(eventId, token) : null;
  const mySlots = participant ? await getParticipantSlots(participant.id) : [];

  const joined = participant !== null;
  const open = event.status === 'open';

  return (
    <div className="flex-1">
      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="serial">№ {slug}</p>
          <h1 className="font-display font-bold text-[36px] leading-tight">{event.title}</h1>
          {event.description && <p className="text-pencil">{event.description}</p>}
        </div>

        {!open && (
          <div className="card p-6">
            <p>This event is closed.</p>
          </div>
        )}

        {open && !joined && (
          <>
            <div className="tear-line" />
            <JoinForm slug={slug} />
          </>
        )}

        <AvailabilityGrid
          key={joined ? 'joined' : 'anon'}
          slots={slots}
          heatmap={heatmap}
          participantCount={heatmap.participantCount}
          mySlots={mySlots}
          joined={joined}
          open={open}
          myName={participant?.displayName}
        />
      </main>
    </div>
  );
}
