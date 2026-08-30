'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { closeEvent, createEvent, deleteEvent, patchEvent } from '@/lib/db/queries/events';
import { DomainError } from '@/lib/domain/shared/errors';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

function toEditor(eventId: string, opts?: { error?: string; section?: string }): never {
  const qs = new URLSearchParams();
  if (opts?.error) qs.set('error', opts.error);
  if (opts?.section) qs.set('section', opts.section);
  const suffix = qs.toString();
  redirect(`/events/${eventId}${suffix ? `?${suffix}` : ''}`);
}

export async function createEventAction(formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const authorTimezone = String(formData.get('authorTimezone') ?? '').trim();
  const dateStart = String(formData.get('dateStart') ?? '').trim();
  const dateEnd = String(formData.get('dateEnd') ?? '').trim();
  const dayStartTime = String(formData.get('dayStartTime') ?? '').trim();
  const dayEndTime = String(formData.get('dayEndTime') ?? '').trim();

  if (!title) redirect(`/events?error=${encodeURIComponent('Title is required')}`);
  if (title.length > TITLE_MAX)
    redirect(`/events?error=${encodeURIComponent(`Title is too long (max ${TITLE_MAX} characters)`)}`);
  if (description.length > DESCRIPTION_MAX)
    redirect(`/events?error=${encodeURIComponent(`Description is too long (max ${DESCRIPTION_MAX} characters)`)}`);
  if (!authorTimezone) redirect(`/events?error=${encodeURIComponent('Time zone is required')}`);

  let created: { id: string; slug: string };
  try {
    created = await createEvent({
      title,
      description: description || undefined,
      authorTimezone,
      dateStart,
      dateEnd,
      dayStartTime,
      dayEndTime,
    });
  } catch (e) {
    if (e instanceof DomainError) redirect(`/events?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/events/${created.id}`);
}

export async function patchEventAction(eventId: string, formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!title) toEditor(eventId, { error: 'Title is required', section: 'details' });
  if (title.length > TITLE_MAX)
    toEditor(eventId, { error: `Title is too long (max ${TITLE_MAX} characters)`, section: 'details' });
  if (description.length > DESCRIPTION_MAX)
    toEditor(eventId, { error: `Description is too long (max ${DESCRIPTION_MAX} characters)`, section: 'details' });
  try {
    await patchEvent(eventId, { title, description });
  } catch (e) {
    if (e instanceof DomainError) toEditor(eventId, { error: e.message, section: 'details' });
    throw e;
  }
  revalidatePath(`/events/${eventId}`);
  toEditor(eventId);
}

export async function closeEventAction(eventId: string): Promise<void> {
  try {
    await closeEvent(eventId);
  } catch (e) {
    if (e instanceof DomainError) toEditor(eventId, { error: e.message, section: 'status' });
    throw e;
  }
  revalidatePath(`/events/${eventId}`);
  toEditor(eventId);
}

export async function deleteEventAction(eventId: string): Promise<void> {
  try {
    await deleteEvent(eventId);
  } catch (e) {
    if (e instanceof DomainError) toEditor(eventId, { error: e.message, section: 'status' });
    throw e;
  }
  redirect('/events');
}
