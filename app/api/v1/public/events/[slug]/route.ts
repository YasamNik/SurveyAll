import { NextResponse } from 'next/server';
import { handle } from '@/lib/api/errors';
import { getPublicEventBySlug } from '@/lib/db/queries/events';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await params;
    const result = await getPublicEventBySlug(slug);
    return NextResponse.json(result);
  });
}
