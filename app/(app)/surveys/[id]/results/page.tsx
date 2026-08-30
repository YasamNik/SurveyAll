import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResults, getSurveyWithQuestions } from '@/lib/db/queries/surveys';

export const dynamic = 'force-dynamic';

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}

function qNumber(i: number): string {
  return String(i + 1).padStart(2, '0');
}

export default async function SurveyResultsPage(props: PageProps<'/surveys/[id]/results'>) {
  const { id } = await props.params;

  const data = await getSurveyWithQuestions(id);
  if (!data) notFound();

  const { responseCount, results } = await getResults(id);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/surveys/${id}`} className="btn-link text-sm">
          &larr; Back to editor
        </Link>
        <h1 className="font-display font-bold text-[28px]">{data.survey.title} — Results</h1>
        <p className="font-mono text-xs text-pencil">
          {responseCount} response{responseCount === 1 ? '' : 's'}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="text-pencil">No questions.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {results.map((r, i) => {
            const optionMax = r.optionCounts ? Math.max(...r.optionCounts.map((o) => o.count), 0) : 0;
            const ratingMax = r.ratingCounts ? Math.max(...r.ratingCounts.map((rc) => rc.count), 0) : 0;

            return (
              <div key={r.questionId} className="card p-6">
                <h2 className="font-semibold mb-4 flex gap-2">
                  <span className="q-number">{qNumber(i)}</span>
                  {r.prompt}
                </h2>

                {r.optionCounts && (
                  <ul className="flex flex-col gap-3">
                    {r.optionCounts.map((o) => (
                      <li key={o.optionId} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm">{o.label}</span>
                          <span className="font-mono text-sm shrink-0">{o.count}</span>
                        </div>
                        <div className="tally-track">
                          {o.count > 0 && <div className="tally-fill" style={{ width: `${pct(o.count, optionMax)}%` }} />}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {r.texts &&
                  (r.texts.length === 0 ? (
                    <p className="text-pencil text-sm">No responses yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {r.texts.map((t, ti) => (
                        <li key={ti} className="text-sm">
                          &ldquo;{t}&rdquo;
                        </li>
                      ))}
                    </ul>
                  ))}

                {r.ratingAverage !== undefined && (
                  <div className="flex flex-col gap-3">
                    <p className="font-mono text-sm">
                      Average: {r.ratingAverage === null ? '—' : r.ratingAverage.toFixed(2)}
                    </p>
                    {r.ratingCounts && (
                      <ul className="flex flex-col gap-3">
                        {r.ratingCounts.map((rc) => (
                          <li key={rc.value} className="flex flex-col gap-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-mono text-sm">{rc.value}</span>
                              <span className="font-mono text-sm shrink-0">{rc.count}</span>
                            </div>
                            <div className="tally-track">
                              {rc.count > 0 && (
                                <div className="tally-fill" style={{ width: `${pct(rc.count, ratingMax)}%` }} />
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
