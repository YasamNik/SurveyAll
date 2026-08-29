export function buildHealthReport(dbOk: boolean, now: Date) {
  return { status: dbOk ? ('ok' as const) : ('degraded' as const), db: dbOk, time: now.toISOString() };
}
