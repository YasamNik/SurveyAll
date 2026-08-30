import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days

function cookieName(eventId: string): string {
  return `evt_${eventId}`;
}

export async function readParticipantToken(eventId: string): Promise<string | null> {
  const store = await cookies();
  return store.get(cookieName(eventId))?.value ?? null;
}

export function setParticipantCookie(res: NextResponse, req: Request, eventId: string, token: string): void {
  const secure = req.headers.get('x-forwarded-proto') === 'https';
  res.cookies.set(cookieName(eventId), token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure,
  });
}
