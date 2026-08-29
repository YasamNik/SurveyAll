import { NextResponse } from 'next/server';
import { DomainError, type DomainErrorCode } from '@/lib/domain/shared/errors';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_PUBLISHED: 404,
  SURVEY_CLOSED: 409,
  QUESTIONS_FROZEN: 409,
  INVALID_ANSWER: 422,
  RESULTS_HIDDEN: 403,
};

export function toHttp(e: unknown): NextResponse {
  if (e instanceof DomainError) {
    return NextResponse.json({ error: e.code, message: e.message }, { status: STATUS_BY_CODE[e.code] });
  }
  console.error(e);
  return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
}

export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    return toHttp(e);
  }
}
