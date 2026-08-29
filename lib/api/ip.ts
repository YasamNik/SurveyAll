import { createHash } from 'crypto';

export function ipHashFrom(req: Request): string | null {
  const ip = req.headers.get('CF-Connecting-IP') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip) return null;
  return createHash('sha256').update(`${ip}:${process.env.IP_HASH_SALT ?? ''}`).digest('hex');
}
