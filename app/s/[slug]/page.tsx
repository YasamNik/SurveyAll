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
    <div className={`theme-${survey.theme} flex-1`}>
      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="serial">№ {slug}</p>
          <h1 className="font-display font-bold text-[36px] leading-tight">{survey.title}</h1>
          {survey.description && <p className="text-pencil">{survey.description}</p>}
        </div>

        {survey.status === 'closed' ? (
          <div className="card p-6 flex flex-col gap-2">
            <p>This survey is closed.</p>
            {survey.showResultsToRespondents && (
              <p>
                <a href={`/api/v1/public/surveys/${slug}/results`} className="btn-link">
                  View results
                </a>
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="tear-line" />
            <RespondForm survey={{ slug, respondentName: survey.respondentName }} questions={questions} />
          </>
        )}
      </main>
    </div>
  );
}
