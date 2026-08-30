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
    <div className={`theme-${survey.theme} flex-1`}>
      <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <h1 className="font-display font-bold text-[28px]">Thanks — your response was recorded.</h1>
        {survey.showResultsToRespondents && (
          <p>
            <a href={`/api/v1/public/surveys/${slug}/results`} className="btn-link">
              View results
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
