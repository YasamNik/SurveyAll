import { NextResponse } from 'next/server';
import { handle } from '@/lib/api/errors';
import { closeEvent } from '@/lib/db/queries/events';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    await closeEvent(id);
    return NextResponse.json({ ok: true });
  });
}
