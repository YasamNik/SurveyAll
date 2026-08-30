import { notFound } from 'next/navigation';
import { DomainError } from '@/lib/domain/shared/errors';
import { getPublishedSurveyBySlug } from '@/lib/db/queries/public';

export const dynamic = 'force-dynamic';

export default async function DonePage(props: PageProps<'/s/[slug]/done'>) {
  const { slug } = await props.params;

  let survey;
  try {
    ({ survey } = await getPublishedSurveyBySlug(slug));
  } catch (e) {
    if (e instanceof DomainError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <main className="max-w-xl mx-auto p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Thanks — your response was recorded.</h1>
      {survey.showResultsToRespondents && (
        <p>
          <a href={`/api/v1/public/surveys/${slug}/results`} className="text-blue-600 hover:underline">
            View results
          </a>
        </p>
      )}
    </main>
  );
}
