import Link from 'next/link';
import { countResponses, listSurveys } from '@/lib/db/queries/surveys';
import { createSurveyAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function SurveysPage(props: PageProps<'/surveys'>) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === 'string' ? searchParams.error : null;

  const surveys = await listSurveys();
  const counts = await Promise.all(surveys.map((s) => countResponses(s.id)));

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Surveys</h1>

      <form action={createSurveyAction} className="flex flex-col gap-3 border border-gray-300 rounded p-4">
        <h2 className="font-semibold">New survey</h2>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Title</span>
          <input type="text" name="title" required className="border rounded px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Description</span>
          <textarea name="description" rows={2} className="border rounded px-2 py-1" />
        </label>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <button type="submit" className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Create survey
        </button>
      </form>

      {surveys.length === 0 ? (
        <p>No surveys yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Responses</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((s, i) => (
              <tr key={s.id} className="border-b">
                <td className="py-2 pr-4">{s.title}</td>
                <td className="py-2 pr-4">{s.status}</td>
                <td className="py-2 pr-4">{counts[i]}</td>
                <td className="py-2 flex gap-3">
                  <Link href={`/surveys/${s.id}`} className="text-blue-600 hover:underline">
                    Edit
                  </Link>
                  <Link href={`/surveys/${s.id}/results`} className="text-blue-600 hover:underline">
                    Results
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
