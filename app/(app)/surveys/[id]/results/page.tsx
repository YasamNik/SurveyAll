import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResults, getSurveyWithQuestions } from '@/lib/db/queries/surveys';

export const dynamic = 'force-dynamic';

export default async function SurveyResultsPage(props: PageProps<'/surveys/[id]/results'>) {
  const { id } = await props.params;

  const data = await getSurveyWithQuestions(id);
  if (!data) notFound();

  const { responseCount, results } = await getResults(id);

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <Link href={`/surveys/${id}`} className="text-blue-600 hover:underline text-sm">
          &larr; Back to editor
        </Link>
        <h1 className="text-2xl font-bold mt-2">{data.survey.title} — Results</h1>
        <p className="text-sm text-gray-500">
          {responseCount} response{responseCount === 1 ? '' : 's'}
        </p>
      </div>

      {results.length === 0 ? (
        <p>No questions.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {results.map((r) => (
            <div key={r.questionId} className="border border-gray-300 rounded p-4">
              <h2 className="font-semibold mb-2">{r.prompt}</h2>

              {r.optionCounts && (
                <ul className="flex flex-col gap-1">
                  {r.optionCounts.map((o) => (
                    <li key={o.optionId} className="font-mono text-sm">
                      {o.label} — {o.count}
                    </li>
                  ))}
                </ul>
              )}

              {r.texts &&
                (r.texts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No responses yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1 list-disc list-inside">
                    {r.texts.map((t, i) => (
                      <li key={i} className="text-sm">
                        {t}
                      </li>
                    ))}
                  </ul>
                ))}

              {r.ratingAverage !== undefined && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm">Average: {r.ratingAverage === null ? '—' : r.ratingAverage.toFixed(2)}</p>
                  {r.ratingCounts && (
                    <ul className="flex flex-col gap-1">
                      {r.ratingCounts.map((rc) => (
                        <li key={rc.value} className="font-mono text-sm">
                          {rc.value} — {rc.count}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
