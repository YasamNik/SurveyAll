import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { ipHashFrom } from '@/lib/api/ip';
import { submitResponse } from '@/lib/db/queries/public';

const bodySchema = z.object({
  answers: z.record(
    z.string(),
    z.union([z.string().max(10000), z.array(z.string().max(100)).max(50), z.number()]),
  ),
});

const CLIENT_TOKEN_MAX = 128;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

// Single long-running container — module-level in-memory state is correct here.
const submitTimestamps = new Map<string, number[]>();

function isRateLimited(ipHash: string): boolean {
  const now = Date.now();
  const recent = (submitTimestamps.get(ipHash) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    submitTimestamps.set(ipHash, recent);
    return true;
  }
  recent.push(now);
  submitTimestamps.set(ipHash, recent);
  return false;
}

function clientTokenFrom(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === 'client_token') return decodeURIComponent(rest.join('=')).slice(0, CLIENT_TOKEN_MAX);
  }
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ipHash = ipHashFrom(req);
  if (ipHash !== null && isRateLimited(ipHash)) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }

  return handle(async () => {
    const { slug } = await params;
    const body = bodySchema.parse(await req.json());
    const clientToken = clientTokenFrom(req);
    const result = await submitResponse(slug, body.answers, { ipHash, clientToken });
    return NextResponse.json(result, { status: 201 });
  });
}
