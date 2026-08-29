import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { deleteQuestion, putQuestion } from '@/lib/db/queries/surveys';

const questionSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(['single_choice', 'multi_choice', 'free_text', 'rating']),
  required: z.boolean().default(false),
  config: z.object({ min: z.number().int(), max: z.number().int() }).nullish(),
  options: z.array(z.object({ id: z.string().optional(), label: z.string().min(1) })).default([]),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; qid: string }> }) {
  return handle(async () => {
    const { id, qid } = await params;
    const body = questionSchema.parse(await req.json());
    await putQuestion(id, qid, body);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; qid: string }> }) {
  return handle(async () => {
    const { id, qid } = await params;
    await deleteQuestion(id, qid);
    return new NextResponse(null, { status: 204 });
  });
}
