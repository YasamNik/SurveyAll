import { NextResponse } from 'next/server';
import { handle } from '@/lib/api/errors';
import { getPublicResults } from '@/lib/db/queries/public';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await params;
    const result = await getPublicResults(slug);
    return NextResponse.json(result);
  });
}
