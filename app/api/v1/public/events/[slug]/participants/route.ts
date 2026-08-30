import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { ipHashFrom } from '@/lib/api/ip';
import { createRateLimiter } from '@/lib/api/rate-limit';
import { setParticipantCookie } from '@/lib/api/participant-cookie';
import { getEventIdBySlug, joinEvent } from '@/lib/db/queries/events';

const bodySchema = z.object({
  displayName: z.string().max(100),
});

const isRateLimited = createRateLimiter();

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ipHash = ipHashFrom(req);
  if (ipHash !== null && isRateLimited(ipHash)) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }

  return handle(async () => {
    const { slug } = await params;
    const body = bodySchema.parse(await req.json());
    const eventId = await getEventIdBySlug(slug);
    const { participantId, token } = await joinEvent(slug, body.displayName);

    const res = NextResponse.json({ participantId }, { status: 201 });
    setParticipantCookie(res, req, eventId, token);
    return res;
  });
}
