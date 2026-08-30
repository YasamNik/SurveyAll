import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getSurveyWithQuestions } from '@/lib/db/queries/surveys';
import { Star } from '@/app/components/stars';
import { THEMES } from '@/lib/themes';
import {
  addQuestionAction,
  closeSurveyAction,
  deleteQuestionAction,
  patchSurveyAction,
  publishSurveyAction,
  putQuestionAction,
  toggleResultsAction,
} from '../actions';
import { QuestionTypeFields, typeLabel } from './question-type-fields';
import { SharePanel } from './share-panel';

export const dynamic = 'force-dynamic';

const STATUS_CHIP: Record<string, string> = {
  draft: 'chip-draft',
  published: 'chip-published',
  closed: 'chip-closed',
};

function qNumber(i: number): string {
  return String(i + 1).padStart(2, '0');
}

export default async function SurveyEditorPage(props: PageProps<'/surveys/[id]'>) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === 'string' ? searchParams.error : null;
  const section = typeof searchParams.section === 'string' ? searchParams.section : null;

  const data = await getSurveyWithQuestions(id);
  if (!data) notFound();
  const { survey, questions } = data;

  const isDraft = survey.status === 'draft';
  const isClosed = survey.status === 'closed';
  const isPublished = survey.status === 'published';

  const hdrs = await headers();
  const publicUrl = survey.slug ? `https://${hdrs.get('host') ?? ''}/s/${survey.slug}` : null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/surveys" className="btn-link text-sm">
          &larr; All surveys
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-bold text-[28px]">{survey.title}</h1>
          <span className={`chip ${STATUS_CHIP[survey.status]}`}>{survey.status}</span>
        </div>
      </div>

      <section className="card p-6 flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold">Details</h2>
        {section === 'details' && error && (
          <p role="alert" className="error-strip">
            {error}
          </p>
        )}
        {isClosed ? (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium">Title:</span> {survey.title}
            </p>
            <p>
              <span className="font-medium">Description:</span> {survey.description || '—'}
            </p>
          </div>
        ) : (
          <form action={patchSurveyAction.bind(null, survey.id)} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="field-label">Title</span>
              <input
                type="text"
                name="title"
                defaultValue={survey.title}
                required
                className="field-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="field-label">Description</span>
              <textarea
                name="description"
                defaultValue={survey.description ?? ''}
                rows={2}
                className="field-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="field-label">Theme</span>
              <select name="theme" defaultValue={survey.theme} className="field-input">
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary self-start">
              Save changes
            </button>
          </form>
        )}

        {!isDraft && (
          <form action={toggleResultsAction.bind(null, survey.id, !survey.showResultsToRespondents)}>
            <button type="submit" className="btn-link text-sm">
              {survey.showResultsToRespondents ? 'Hide results from respondents' : 'Show results to respondents'}
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold">Questions</h2>
        {questions.length === 0 && <p className="text-pencil">No questions yet — add your first one.</p>}

        {questions.map((q, i) => (
          <div key={q.id} className="card p-6 flex flex-col gap-3">
            {section === `question-${q.id}` && error && (
              <p role="alert" className="error-strip">
                {error}
              </p>
            )}
            {isClosed ? (
              <div className="flex flex-col gap-1">
                <p className="flex gap-2">
                  <span className="q-number">{qNumber(i)}</span>
                  <span className="font-medium">{q.prompt}</span>
                </p>
                <p className="text-sm text-pencil flex items-center gap-1">
                  {q.type === 'rating' && <Star filled />}
                  {typeLabel(q.type)}
                  {q.required ? ' (required)' : ''}
                </p>
                {q.options.length > 0 && (
                  <ul className="list-disc list-inside text-sm">
                    {q.options.map((o) => (
                      <li key={o.id}>{o.label}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <form
                action={putQuestionAction.bind(
                  null,
                  survey.id,
                  q.id,
                  q.options.map((o) => o.id),
                )}
                className="flex flex-col gap-3"
              >
                <label className="flex flex-col gap-1">
                  <span className="field-label">
                    <span className="q-number mr-2">{qNumber(i)}</span>
                    Prompt
                  </span>
                  <input
                    type="text"
                    name="prompt"
                    defaultValue={q.prompt}
                    required
                    className="field-input"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="required" defaultChecked={q.required} className="h-4 w-4" />
                  <span>Required</span>
                </label>

                <QuestionTypeFields
                  defaultType={q.type}
                  locked={!isDraft}
                  defaultOptions={q.options.map((o) => o.label).join('\n')}
                  optionsRows={Math.max(3, q.options.length)}
                  defaultMin={q.config?.min ?? 1}
                  defaultMax={q.config?.max ?? 5}
                />

                <button type="submit" className="btn btn-primary self-start">
                  Save question
                </button>
              </form>
            )}
            {isDraft && (
              <form action={deleteQuestionAction.bind(null, survey.id, q.id)}>
                <button type="submit" className="text-flag text-sm underline hover:no-underline">
                  Delete question
                </button>
              </form>
            )}
          </div>
        ))}

        {isDraft && (
          <details className="add-question" open={section === 'add-question' && !!error}>
            <summary className="btn btn-secondary add-question-summary">Add question</summary>
            <div className="border border-dashed border-rule rounded-md p-6 mt-3">
              {section === 'add-question' && error && (
                <p role="alert" className="error-strip mb-3">
                  {error}
                </p>
              )}
              <form action={addQuestionAction.bind(null, survey.id)} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="field-label">Prompt</span>
                  <input type="text" name="prompt" required className="field-input" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="required" className="h-4 w-4" />
                  <span>Required</span>
                </label>
                <QuestionTypeFields defaultType="single_choice" />
                <button type="submit" className="btn btn-primary self-start">
                  Add question
                </button>
              </form>
            </div>
          </details>
        )}
      </section>

      <section className="card p-6 flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold">Status</h2>
        {section === 'status' && error && (
          <p role="alert" className="error-strip">
            {error}
          </p>
        )}
        {isDraft && (
          <form action={publishSurveyAction.bind(null, survey.id)}>
            <button type="submit" className="btn btn-primary">
              Publish
            </button>
          </form>
        )}
        {publicUrl && <SharePanel url={publicUrl} closed={isClosed} />}
        {isPublished && survey.slug && (
          <form action={closeSurveyAction.bind(null, survey.id)}>
            <button type="submit" className="btn btn-flag">
              Close survey
            </button>
          </form>
        )}
        <p className="text-sm">
          <Link href={`/surveys/${survey.id}/results`} className="btn-link">
            View results
          </Link>
        </p>
      </section>
    </main>
  );
}
