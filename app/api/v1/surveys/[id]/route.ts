import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { DomainError } from '@/lib/domain/shared/errors';
import { deleteSurvey, getSurveyWithQuestions, patchSurvey } from '@/lib/db/queries/surveys';
import { THEME_IDS } from '@/lib/themes';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  showResultsToRespondents: z.boolean().optional(),
  theme: z.enum(THEME_IDS).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const result = await getSurveyWithQuestions(id);
    if (!result) throw new DomainError('NOT_FOUND');
    return NextResponse.json(result);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    await patchSurvey(id, body);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    await deleteSurvey(id);
    return new NextResponse(null, { status: 204 });
  });
}
