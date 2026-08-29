import { buildHealthReport } from '@/lib/domain/shared/health';
import { pingDb } from '@/lib/db/queries/health';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const dbOk = await pingDb();
  const health = buildHealthReport(dbOk, new Date());

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-2xl font-bold mb-4">SurveyAll — status: {health.status}</h1>
      <a href="/surveys" className="text-blue-600 hover:text-blue-800 underline">
        Go to Surveys
      </a>
    </div>
  );
}
