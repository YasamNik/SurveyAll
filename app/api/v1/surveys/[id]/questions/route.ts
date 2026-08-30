import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { addQuestion } from '@/lib/db/queries/surveys';

const questionSchema = z
  .object({
    prompt: z.string().min(1).max(500),
    type: z.enum(['single_choice', 'multi_choice', 'free_text', 'rating']),
    required: z.boolean().default(false),
    config: z.object({ min: z.number().int(), max: z.number().int() }).nullish(),
    options: z
      .array(z.object({ id: z.string().optional(), label: z.string().min(1).max(200) }))
      .max(20)
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'rating') return;
    if (!data.config) {
      ctx.addIssue({ code: 'custom', message: 'rating config is required', path: ['config'] });
      return;
    }
    if (data.config.min >= data.config.max) {
      ctx.addIssue({ code: 'custom', message: 'min must be less than max', path: ['config'] });
    } else if (data.config.max - data.config.min > 10) {
      ctx.addIssue({ code: 'custom', message: 'rating range too large (max span is 10)', path: ['config'] });
    }
  });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = questionSchema.parse(await req.json());
    const result = await addQuestion(id, body);
    return NextResponse.json(result, { status: 201 });
  });
}
