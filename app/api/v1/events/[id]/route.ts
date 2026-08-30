import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { DomainError } from '@/lib/domain/shared/errors';
import { deleteEvent, getEvent, patchEvent } from '@/lib/db/queries/events';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const event = await getEvent(id);
    if (!event) throw new DomainError('NOT_FOUND');
    return NextResponse.json(event);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    await patchEvent(id, body);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    await deleteEvent(id);
    return new NextResponse(null, { status: 204 });
  });
}
