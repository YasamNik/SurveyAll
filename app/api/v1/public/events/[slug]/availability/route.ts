import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { ipHashFrom } from '@/lib/api/ip';
import { createRateLimiter } from '@/lib/api/rate-limit';
import { readParticipantToken } from '@/lib/api/participant-cookie';
import { DomainError } from '@/lib/domain/shared/errors';
import { getEventIdBySlug, setAvailability } from '@/lib/db/queries/events';

const bodySchema = z.object({
  slots: z.array(z.string().max(40)).max(2000),
});

// Realtime autosave debounces at ~800ms per change, but a fast multi-stroke
// painting session can still fire several PUTs a minute — raise the budget
// here only (joins stay at the shared default of 10/60s).
const isRateLimited = createRateLimiter(60_000, 30);

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ipHash = ipHashFrom(req);
  if (ipHash !== null && isRateLimited(ipHash)) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }

  return handle(async () => {
    const { slug } = await params;
    const body = bodySchema.parse(await req.json());
    const eventId = await getEventIdBySlug(slug);
    const token = await readParticipantToken(eventId);
    if (!token) throw new DomainError('NOT_FOUND', 'participant not found');

    const saved = await setAvailability(slug, token, body.slots);
    return NextResponse.json({ saved });
  });
}
