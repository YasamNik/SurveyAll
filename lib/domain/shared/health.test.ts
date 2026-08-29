import { describe, it, expect } from 'vitest';
import { buildHealthReport } from './health';

describe('buildHealthReport', () => {
  it('is ok when db is up', () => {
    expect(buildHealthReport(true, new Date('2026-08-29T00:00:00Z')))
      .toEqual({ status: 'ok', db: true, time: '2026-08-29T00:00:00.000Z' });
  });
  it('is degraded when db is down', () => {
    expect(buildHealthReport(false, new Date(0)).status).toBe('degraded');
  });
});
