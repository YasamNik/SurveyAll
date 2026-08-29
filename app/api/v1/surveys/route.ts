import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { createSurvey, listSurveys } from '@/lib/db/queries/surveys';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  return handle(async () => {
    const surveys = await listSurveys();
    return NextResponse.json(surveys);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = createSchema.parse(await req.json());
    const result = await createSurvey(body);
    return NextResponse.json(result, { status: 201 });
  });
}
