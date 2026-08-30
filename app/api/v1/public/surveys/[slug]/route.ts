import { NextResponse } from 'next/server';
import { handle } from '@/lib/api/errors';
import { getPublishedSurveyBySlug } from '@/lib/db/queries/public';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await params;
    const { survey, questions } = await getPublishedSurveyBySlug(slug);
    return NextResponse.json({
      survey: {
        title: survey.title,
        description: survey.description,
        status: survey.status,
        slug: survey.slug,
        showResultsToRespondents: survey.showResultsToRespondents,
        theme: survey.theme,
        respondentName: survey.respondentName,
      },
      questions,
    });
  });
}
