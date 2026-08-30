import { describe, it, expect } from 'vitest';
import { zonedTimeToUtc } from './timezone';
import { DomainError } from '../shared/errors';

describe('zonedTimeToUtc', () => {
  it('UTC is the identity zone', () => {
    const d = zonedTimeToUtc('2026-03-03', '09:00', 'UTC');
    expect(d.toISOString()).toBe('2026-03-03T09:00:00.000Z');
  });

  it('America/Toronto in winter is UTC-5 (EST)', () => {
    const d = zonedTimeToUtc('2026-01-15', '12:00', 'America/Toronto');
    expect(d.toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('America/Toronto in summer is UTC-4 (EDT)', () => {
    const d = zonedTimeToUtc('2026-07-15', '12:00', 'America/Toronto');
    expect(d.toISOString()).toBe('2026-07-15T16:00:00.000Z');
  });

  it('Asia/Kolkata is UTC+5:30 (no DST)', () => {
    const d = zonedTimeToUtc('2026-03-03', '09:00', 'Asia/Kolkata');
    expect(d.toISOString()).toBe('2026-03-03T03:30:00.000Z');
  });

  it('resolves a wall-clock time on the DST spring-forward day (2026-03-08, Toronto)', () => {
    // Clocks jump 02:00 -> 03:00 local at 07:00 UTC. 03:30 local only exists as EDT (UTC-4).
    const d = zonedTimeToUtc('2026-03-08', '03:30', 'America/Toronto');
    expect(d.toISOString()).toBe('2026-03-08T07:30:00.000Z');
  });

  it('picks up the new offset for a time later on the DST spring-forward day', () => {
    const d = zonedTimeToUtc('2026-03-08', '09:00', 'America/Toronto');
    expect(d.toISOString()).toBe('2026-03-08T13:00:00.000Z');
  });

  it('throws DomainError INVALID_ANSWER for an unknown time zone', () => {
    expect(() => zonedTimeToUtc('2026-01-01', '09:00', 'Not/AZone')).toThrow(DomainError);
    try {
      zonedTimeToUtc('2026-01-01', '09:00', 'Not/AZone');
    } catch (e) {
      expect((e as DomainError).code).toBe('INVALID_ANSWER');
    }
  });
});
