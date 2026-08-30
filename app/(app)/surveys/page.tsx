import Link from 'next/link';
import { countResponses, listSurveys } from '@/lib/db/queries/surveys';
import { createSurveyAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_CHIP: Record<string, string> = {
  draft: 'chip-draft',
  published: 'chip-published',
  closed: 'chip-closed',
};

export default async function SurveysPage(props: PageProps<'/surveys'>) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === 'string' ? searchParams.error : null;

  const surveys = await listSurveys();
  const counts = await Promise.all(surveys.map((s) => countResponses(s.id)));

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-10">
      <h1 className="font-display font-bold text-[28px]">Surveys</h1>

      <form action={createSurveyAction} className="card p-6 flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold">New survey</h2>
        <label className="flex flex-col gap-1">
          <span className="field-label">Title</span>
          <input type="text" name="title" required className="field-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Description</span>
          <textarea name="description" rows={2} className="field-input" />
        </label>
        {error && (
          <p role="alert" className="error-strip">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary self-start">
          Create survey
        </button>
      </form>

      {surveys.length === 0 ? (
        <p className="text-pencil">No surveys yet — create your first one.</p>
      ) : (
        <ul className="flex flex-col">
          {surveys.map((s, i) => (
            <li key={s.id} className="border-b border-rule py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="font-medium truncate">{s.title}</span>
                <div className="flex items-center gap-3">
                  <span className={`chip ${STATUS_CHIP[s.status]}`}>{s.status}</span>
                  <span className="font-mono text-xs text-pencil">
                    {counts[i]} response{counts[i] === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Link href={`/surveys/${s.id}`} className="btn-link text-sm">
                  Edit
                </Link>
                <Link href={`/surveys/${s.id}/results`} className="btn-link text-sm">
                  Results
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
