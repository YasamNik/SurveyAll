import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResults, getSurveyWithQuestions } from '@/lib/db/queries/surveys';
import { DonutChart } from '@/app/components/donut-chart';
import { Stars } from '@/app/components/stars';

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

  const { responseCount, results, respondents, respondentName } = await getResults(id);
  const unnamedCount = responseCount - respondents.length;
  const respondentsLine = [...respondents, ...(unnamedCount > 0 ? [`+ ${unnamedCount} unnamed`] : [])].join(', ');

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
        {respondentName !== 'none' && responseCount > 0 && (
          <p className="font-mono text-xs text-pencil">Respondents: {respondentsLine}</p>
        )}
      </div>

      {results.length === 0 ? (
        <p className="text-pencil">No questions.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {results.map((r, i) => {
            const ratingMax = r.ratingCounts ? Math.max(...r.ratingCounts.map((rc) => rc.count), 0) : 0;
            const ratingMin = r.ratingCounts?.[0]?.value ?? 0;
            const ratingScaleMax = r.ratingCounts?.[r.ratingCounts.length - 1]?.value ?? 0;
            const starCount = ratingScaleMax - ratingMin + 1;
            const answeredCount = r.ratingCounts?.reduce((sum, rc) => sum + rc.count, 0) ?? 0;
            const filledStars =
              r.ratingAverage != null
                ? Math.min(starCount, Math.max(0, Math.round(r.ratingAverage) - ratingMin + 1))
                : 0;

            return (
              <div key={r.questionId} className="card p-6">
                <h2 className="font-semibold mb-4 flex gap-2">
                  <span className="q-number">{qNumber(i)}</span>
                  {r.prompt}
                </h2>

                {r.optionCounts && (
                  <DonutChart options={r.optionCounts} multi={r.type === 'multi_choice'} />
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
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Stars value={filledStars} max={starCount} />
                      <span className="font-mono text-sm text-pencil">
                        {r.ratingAverage === null
                          ? 'No answers yet'
                          : `${r.ratingAverage.toFixed(1)} average · ${answeredCount} answer${answeredCount === 1 ? '' : 's'}`}
                      </span>
                    </div>
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
