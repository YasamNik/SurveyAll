import { NextResponse } from 'next/server';
import { handle } from '@/lib/api/errors';
import { getResults } from '@/lib/db/queries/surveys';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const result = await getResults(id);
    return NextResponse.json({ responseCount: result.responseCount, results: result.results });
  });
}
