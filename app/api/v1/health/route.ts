import { NextResponse } from 'next/server';
import { buildHealthReport } from '@/lib/domain/shared/health';
import { pingDb } from '@/lib/db/queries/health';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json(buildHealthReport(await pingDb(), new Date()));
}
