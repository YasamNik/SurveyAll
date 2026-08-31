import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/api/errors';
import { createEvent, listEvents } from '@/lib/db/queries/events';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  authorTimezone: z.string().min(1).max(64),
  dateStart: z.string().max(10),
  dateEnd: z.string().max(10),
  dayStartTime: z.string().max(5),
  dayEndTime: z.string().max(5),
  skipWeekends: z.boolean().default(true),
});

export async function GET() {
  return handle(async () => {
    const events = await listEvents();
    return NextResponse.json(events);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = createSchema.parse(await req.json());
    const result = await createEvent(body);
    return NextResponse.json(result, { status: 201 });
  });
}
