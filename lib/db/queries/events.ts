import { randomBytes } from 'crypto';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { availabilitySlots, scheduleEvents, scheduleParticipants } from '../schema';
import { DomainError } from '@/lib/domain/shared/errors';
import { randomSlug } from '@/lib/domain/shared/slug';
import { generateSlots, validateEventWindow, type EventWindow } from '@/lib/domain/scheduling/grid';
import { validatePaintedSlots } from '@/lib/domain/scheduling/availability';

const UNIQUE_VIOLATION = '23505';
const DISPLAY_NAME_MAX = 100;

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === UNIQUE_VIOLATION;
}

function windowOf(event: typeof scheduleEvents.$inferSelect): EventWindow {
  return {
    dateStart: event.dateStart,
    dateEnd: event.dateEnd,
    dayStartTime: event.dayStartTime,
    dayEndTime: event.dayEndTime,
    authorTimezone: event.authorTimezone,
  };
}

async function getEventRowBySlug(slug: string): Promise<typeof scheduleEvents.$inferSelect> {
  const [row] = await db.select().from(scheduleEvents).where(eq(scheduleEvents.slug, slug));
  if (!row) throw new DomainError('NOT_FOUND');
  return row;
}

export async function createEvent(input: {
  title: string;
  description?: string;
  authorTimezone: string;
  dateStart: string;
  dateEnd: string;
  dayStartTime: string;
  dayEndTime: string;
}): Promise<{ id: string; slug: string }> {
  validateEventWindow({
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
    dayStartTime: input.dayStartTime,
    dayEndTime: input.dayEndTime,
    authorTimezone: input.authorTimezone,
  });

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const slug = randomSlug();
    try {
      const [row] = await db
        .insert(scheduleEvents)
        .values({
          title: input.title,
          description: input.description,
          slug,
          authorTimezone: input.authorTimezone,
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
          dayStartTime: input.dayStartTime,
          dayEndTime: input.dayEndTime,
        })
        .returning({ id: scheduleEvents.id, slug: scheduleEvents.slug });
      return row;
    } catch (e) {
      if (isUniqueViolation(e) && attempt < maxAttempts) continue;
      throw e;
    }
  }
  throw new Error('unreachable');
}

export async function listEvents(): Promise<(typeof scheduleEvents.$inferSelect)[]> {
  return db.select().from(scheduleEvents).orderBy(desc(scheduleEvents.createdAt));
}

export async function getEvent(id: string): Promise<typeof scheduleEvents.$inferSelect | null> {
  const [row] = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, id));
  return row ?? null;
}

export async function getEventIdBySlug(slug: string): Promise<string> {
  const event = await getEventRowBySlug(slug);
  return event.id;
}

export async function countParticipants(eventId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(scheduleParticipants)
    .where(eq(scheduleParticipants.eventId, eventId));
  return value;
}

export async function patchEvent(id: string, patch: { title?: string; description?: string }): Promise<void> {
  const result = await db.update(scheduleEvents).set(patch).where(eq(scheduleEvents.id, id)).returning({ id: scheduleEvents.id });
  if (result.length === 0) throw new DomainError('NOT_FOUND');
}

export async function deleteEvent(id: string): Promise<void> {
  const result = await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id)).returning({ id: scheduleEvents.id });
  if (result.length === 0) throw new DomainError('NOT_FOUND');
}

export async function closeEvent(id: string): Promise<void> {
  const [event] = await db.select({ status: scheduleEvents.status }).from(scheduleEvents).where(eq(scheduleEvents.id, id));
  if (!event) throw new DomainError('NOT_FOUND');
  if (event.status !== 'open') throw new DomainError('SURVEY_CLOSED', 'not open');

  await db
    .update(scheduleEvents)
    .set({ status: 'closed', closedAt: new Date() })
    .where(eq(scheduleEvents.id, id));
}

export async function getPublicEventBySlug(slug: string): Promise<{
  event: {
    title: string;
    description: string | null;
    slug: string;
    status: 'open' | 'closed';
    authorTimezone: string;
    dateStart: string;
    dateEnd: string;
    dayStartTime: string;
    dayEndTime: string;
  };
  slots: string[];
}> {
  const event = await getEventRowBySlug(slug);
  const slots = generateSlots(windowOf(event));

  return {
    event: {
      title: event.title,
      description: event.description,
      slug: event.slug,
      status: event.status,
      authorTimezone: event.authorTimezone,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      dayStartTime: event.dayStartTime,
      dayEndTime: event.dayEndTime,
    },
    slots,
  };
}

export async function getParticipantByToken(
  eventId: string,
  token: string,
): Promise<{ id: string; displayName: string } | null> {
  const [row] = await db
    .select({ id: scheduleParticipants.id, displayName: scheduleParticipants.displayName })
    .from(scheduleParticipants)
    .where(and(eq(scheduleParticipants.eventId, eventId), eq(scheduleParticipants.clientToken, token)));
  return row ?? null;
}

export async function getParticipantSlots(participantId: string): Promise<string[]> {
  const rows = await db
    .select({ slotStart: availabilitySlots.slotStart })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.participantId, participantId));
  return rows.map((row) => row.slotStart.toISOString()).sort();
}

export async function joinEvent(slug: string, displayName: string): Promise<{ participantId: string; token: string }> {
  const event = await getEventRowBySlug(slug);
  if (event.status === 'closed') throw new DomainError('SURVEY_CLOSED', 'event is closed');

  const trimmed = displayName.trim();
  if (trimmed.length === 0 || trimmed.length > DISPLAY_NAME_MAX) {
    throw new DomainError('INVALID_ANSWER', 'name must be 1-100 characters');
  }

  const token = randomBytes(16).toString('hex');
  const [row] = await db
    .insert(scheduleParticipants)
    .values({ eventId: event.id, displayName: trimmed, clientToken: token })
    .returning({ id: scheduleParticipants.id });

  return { participantId: row.id, token };
}

export async function setAvailability(slug: string, token: string, painted: unknown): Promise<number> {
  const event = await getEventRowBySlug(slug);
  if (event.status === 'closed') throw new DomainError('SURVEY_CLOSED', 'event is closed');

  const [participant] = await db
    .select({ id: scheduleParticipants.id })
    .from(scheduleParticipants)
    .where(and(eq(scheduleParticipants.eventId, event.id), eq(scheduleParticipants.clientToken, token)));
  if (!participant) throw new DomainError('NOT_FOUND', 'participant not found');

  const grid = generateSlots(windowOf(event));
  const validated = validatePaintedSlots(grid, painted);

  await db.transaction(async (tx) => {
    await tx.delete(availabilitySlots).where(eq(availabilitySlots.participantId, participant.id));
    if (validated.length > 0) {
      await tx.insert(availabilitySlots).values(
        validated.map((slot) => ({ participantId: participant.id, slotStart: new Date(slot) })),
      );
    }
  });

  return validated.length;
}

export async function getHeatmap(slug: string): Promise<{
  participantCount: number;
  slots: { slot: string; count: number; names: string[] }[];
}> {
  const event = await getEventRowBySlug(slug);

  const [{ participantCount }] = await db
    .select({ participantCount: count() })
    .from(scheduleParticipants)
    .where(eq(scheduleParticipants.eventId, event.id));

  const rows = await db
    .select({
      slotStart: availabilitySlots.slotStart,
      displayName: scheduleParticipants.displayName,
    })
    .from(availabilitySlots)
    .innerJoin(scheduleParticipants, eq(availabilitySlots.participantId, scheduleParticipants.id))
    .where(eq(scheduleParticipants.eventId, event.id))
    .orderBy(scheduleParticipants.createdAt);

  const bySlot = new Map<string, string[]>();
  for (const row of rows) {
    const key = row.slotStart.toISOString();
    const names = bySlot.get(key) ?? [];
    names.push(row.displayName);
    bySlot.set(key, names);
  }

  const slots = Array.from(bySlot.entries())
    .map(([slot, names]) => ({ slot, count: names.length, names }))
    .sort((a, b) => a.slot.localeCompare(b.slot));

  return { participantCount, slots };
}
