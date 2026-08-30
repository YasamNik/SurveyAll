import Link from 'next/link';
import { buildHealthReport } from '@/lib/domain/shared/health';
import { pingDb } from '@/lib/db/queries/health';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const dbOk = await pingDb();
  const health = buildHealthReport(dbOk, new Date());
  const chipClass = health.status === 'ok' ? 'chip-published' : 'chip-closed';

  return (
    <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-display font-bold text-[28px]">SurveyAll</h1>
        <p className="text-pencil">Surveys and calendar scheduling for a group.</p>
      </div>

      <p className={`chip ${chipClass}`}>Status: {health.status}</p>

      <div className="flex gap-4">
        <Link href="/surveys" className="btn btn-primary">
          Go to surveys
        </Link>
        <Link href="/events" className="btn btn-primary">
          Go to events
        </Link>
      </div>
    </main>
  );
}
