import { NextResponse } from 'next/server';
import { handle } from '@/lib/api/errors';
import { publishSurvey } from '@/lib/db/queries/surveys';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const result = await publishSurvey(id);
    return NextResponse.json(result);
  });
}
