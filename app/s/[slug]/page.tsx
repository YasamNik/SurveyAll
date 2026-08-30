import { notFound } from 'next/navigation';
import { DomainError } from '@/lib/domain/shared/errors';
import { getPublishedSurveyBySlug } from '@/lib/db/queries/public';
import { RespondForm } from './respond-form';

export const dynamic = 'force-dynamic';

export default async function RespondPage(props: PageProps<'/s/[slug]'>) {
  const { slug } = await props.params;

  let data;
  try {
    data = await getPublishedSurveyBySlug(slug);
  } catch (e) {
    if (e instanceof DomainError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  const { survey, questions } = data;

  return (
    <main className="max-w-xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{survey.title}</h1>
        {survey.description && <p className="text-gray-600 mt-1">{survey.description}</p>}
      </div>

      {survey.status === 'closed' ? (
        <div className="flex flex-col gap-2">
          <p>This survey is closed.</p>
          {survey.showResultsToRespondents && (
            <p>
              <a href={`/api/v1/public/surveys/${slug}/results`} className="text-blue-600 hover:underline">
                View results
              </a>
            </p>
          )}
        </div>
      ) : (
        <RespondForm survey={{ slug }} questions={questions} />
      )}
    </main>
  );
}
