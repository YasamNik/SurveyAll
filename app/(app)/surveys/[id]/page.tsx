import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSurveyWithQuestions } from '@/lib/db/queries/surveys';
import type { QuestionType } from '@/lib/domain/surveys/types';
import {
  addQuestionAction,
  closeSurveyAction,
  deleteQuestionAction,
  patchSurveyAction,
  publishSurveyAction,
  putQuestionAction,
  toggleResultsAction,
} from '../actions';

export const dynamic = 'force-dynamic';

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multi_choice', label: 'Multiple choice' },
  { value: 'free_text', label: 'Free text' },
  { value: 'rating', label: 'Rating' },
];

function typeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
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

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <div>
        <Link href="/surveys" className="text-blue-600 hover:underline text-sm">
          &larr; All surveys
        </Link>
        <h1 className="text-2xl font-bold mt-2">{survey.title}</h1>
        <p className="text-sm text-gray-500">Status: {survey.status}</p>
      </div>

      <section className="border border-gray-300 rounded p-4 flex flex-col gap-3">
        <h2 className="font-semibold">Details</h2>
        {section === 'details' && error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        {isClosed ? (
          <div className="flex flex-col gap-1">
            <p>
              <span className="font-medium">Title:</span> {survey.title}
            </p>
            <p>
              <span className="font-medium">Description:</span> {survey.description || '—'}
            </p>
          </div>
        ) : (
          <form action={patchSurveyAction.bind(null, survey.id)} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-medium">Title</span>
              <input
                type="text"
                name="title"
                defaultValue={survey.title}
                required
                className="border rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Description</span>
              <textarea
                name="description"
                defaultValue={survey.description ?? ''}
                rows={2}
                className="border rounded px-2 py-1"
              />
            </label>
            <button type="submit" className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Save details
            </button>
          </form>
        )}

        {!isDraft && (
          <form action={toggleResultsAction.bind(null, survey.id, !survey.showResultsToRespondents)}>
            <button type="submit" className="text-sm text-blue-600 hover:underline">
              {survey.showResultsToRespondents ? 'Hide results from respondents' : 'Show results to respondents'}
            </button>
          </form>
        )}
      </section>

      <section className="border border-gray-300 rounded p-4 flex flex-col gap-3">
        <h2 className="font-semibold">Status</h2>
        {section === 'status' && error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        {isDraft && (
          <form action={publishSurveyAction.bind(null, survey.id)}>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Publish
            </button>
          </form>
        )}
        {isPublished && survey.slug && (
          <>
            <p>
              Public link:{' '}
              <a href={`/s/${survey.slug}`} className="text-blue-600 hover:underline">
                /s/{survey.slug}
              </a>
            </p>
            <form action={closeSurveyAction.bind(null, survey.id)}>
              <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                Close survey
              </button>
            </form>
          </>
        )}
        {isClosed && survey.slug && (
          <p>
            Public link (closed):{' '}
            <a href={`/s/${survey.slug}`} className="text-blue-600 hover:underline">
              /s/{survey.slug}
            </a>
          </p>
        )}
        <p>
          <Link href={`/surveys/${survey.id}/results`} className="text-blue-600 hover:underline">
            View results
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold">Questions</h2>
        {questions.length === 0 && <p className="text-gray-500">No questions yet.</p>}

        {questions.map((q) => (
          <div key={q.id} className="border border-gray-300 rounded p-4 flex flex-col gap-2">
            {section === `question-${q.id}` && error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            {isClosed ? (
              <div className="flex flex-col gap-1">
                <p className="font-medium">{q.prompt}</p>
                <p className="text-sm text-gray-500">
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
                className="flex flex-col gap-2"
              >
                <label className="flex flex-col gap-1">
                  <span className="font-medium">Prompt</span>
                  <input
                    type="text"
                    name="prompt"
                    defaultValue={q.prompt}
                    required
                    className="border rounded px-2 py-1"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input type="checkbox" name="required" defaultChecked={q.required} />
                  <span>Required</span>
                </label>

                <div className="flex flex-col gap-1">
                  <span className="font-medium">Type</span>
                  {isDraft ? (
                    <select name="type" defaultValue={q.type} className="border rounded px-2 py-1">
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input type="hidden" name="type" value={q.type} />
                      <span className="text-sm text-gray-500">{typeLabel(q.type)} (locked)</span>
                    </>
                  )}
                </div>

                {(q.type === 'single_choice' || q.type === 'multi_choice') && (
                  <label className="flex flex-col gap-1">
                    <span className="font-medium">Options (one per line)</span>
                    <textarea
                      name="options"
                      defaultValue={q.options.map((o) => o.label).join('\n')}
                      rows={Math.max(3, q.options.length)}
                      className="border rounded px-2 py-1"
                    />
                  </label>
                )}

                {q.type === 'rating' && (
                  <div className="flex gap-4">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium">Min</span>
                      <input
                        type="number"
                        name="min"
                        defaultValue={q.config?.min ?? 1}
                        className="border rounded px-2 py-1 w-20"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium">Max</span>
                      <input
                        type="number"
                        name="max"
                        defaultValue={q.config?.max ?? 5}
                        className="border rounded px-2 py-1 w-20"
                      />
                    </label>
                  </div>
                )}

                <button type="submit" className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Save question
                </button>
              </form>
            )}
            {isDraft && (
              <form action={deleteQuestionAction.bind(null, survey.id, q.id)}>
                <button type="submit" className="text-sm text-red-600 hover:underline">
                  Delete question
                </button>
              </form>
            )}
          </div>
        ))}

        {isDraft && (
          <div className="border border-dashed border-gray-400 rounded p-4">
            {section === 'add-question' && error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            <h3 className="font-medium mb-2">Add question</h3>
            <form action={addQuestionAction.bind(null, survey.id)} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-medium">Prompt</span>
                <input type="text" name="prompt" required className="border rounded px-2 py-1" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="required" />
                <span>Required</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium">Type</span>
                <select name="type" defaultValue="single_choice" className="border rounded px-2 py-1">
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium">Options (one per line, for choice questions)</span>
                <textarea name="options" rows={3} className="border rounded px-2 py-1" />
              </label>
              <div className="flex gap-4">
                <label className="flex flex-col gap-1">
                  <span className="font-medium">Rating min</span>
                  <input type="number" name="min" defaultValue={1} className="border rounded px-2 py-1 w-20" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-medium">Rating max</span>
                  <input type="number" name="max" defaultValue={5} className="border rounded px-2 py-1 w-20" />
                </label>
              </div>
              <button type="submit" className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Add question
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
