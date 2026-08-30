import { NextResponse } from 'next/server';
import { handle } from '@/lib/api/errors';
import { getHeatmap } from '@/lib/db/queries/events';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await params;
    const result = await getHeatmap(slug);
    return NextResponse.json(result);
  });
}
