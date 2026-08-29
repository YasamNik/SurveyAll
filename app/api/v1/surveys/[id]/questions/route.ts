import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { addQuestion } from '@/lib/db/queries/surveys';

const questionSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(['single_choice', 'multi_choice', 'free_text', 'rating']),
  required: z.boolean().default(false),
  config: z.object({ min: z.number().int(), max: z.number().int() }).nullish(),
  options: z.array(z.object({ id: z.string().optional(), label: z.string().min(1) })).default([]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = questionSchema.parse(await req.json());
    const result = await addQuestion(id, body);
    return NextResponse.json(result, { status: 201 });
  });
}
