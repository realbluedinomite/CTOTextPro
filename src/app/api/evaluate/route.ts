import { NextResponse } from 'next/server';

import {
  findPracticeScenarioById,
  type PracticeDifficulty,
  type PracticeMode,
} from '@/lib/practice-scenarios';

type TranscriptMessage = {
  role: string;
  content: string;
};

type EvaluateRequestBody = {
  scenarioId: string;
  transcript: TranscriptMessage[];
  mode: PracticeMode;
  difficulty: PracticeDifficulty;
  selfRating: number;
};

type EvaluationMetric = {
  id: string;
  label: string;
  score: number;
  weight: number;
};

const clampScore = (score: number) => Math.min(100, Math.max(45, Math.round(score)));

const adjectiveForScore = (score: number) => {
  if (score >= 90) return 'outstanding';
  if (score >= 80) return 'strong';
  if (score >= 70) return 'steady';
  if (score >= 60) return 'developing';
  return 'nascent';
};

export async function POST(request: Request) {
  let body: EvaluateRequestBody | null = null;

  try {
    body = (await request.json()) as EvaluateRequestBody;
  } catch (error) {
    console.error('Failed to parse /api/evaluate request', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body || !body.scenarioId || !Array.isArray(body.transcript)) {
    return NextResponse.json({ error: 'Missing scenario or transcript' }, { status: 400 });
  }

  const scenario = findPracticeScenarioById(body.scenarioId);

  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  const userMessages = body.transcript.filter((message) => message.role === 'user');
  const assistantMessages = body.transcript.filter((message) => message.role !== 'user');

  const totalWords = userMessages.reduce((sum, message) => sum + message.content.split(/\s+/).filter(Boolean).length, 0);
  const assistantWords = assistantMessages.reduce(
    (sum, message) => sum + message.content.split(/\s+/).filter(Boolean).length,
    0,
  );

  const rawSelfRating = Number(body.selfRating);
  const selfRating = Number.isFinite(rawSelfRating) ? Math.min(5, Math.max(1, rawSelfRating)) : 3;

  const baseScore = clampScore(
    68 + totalWords * 0.6 + assistantWords * 0.2 + (body.mode === 'coaching' ? 6 : 0) + (selfRating - 3) * 4,
  );

  const metrics: EvaluationMetric[] = [
    {
      id: 'clarity',
      label: 'Clarity & Framing',
      score: clampScore(baseScore + 4 - (scenario.difficulty === 'Advanced' ? 6 : 0)),
      weight: 0.35,
    },
    {
      id: 'influence',
      label: 'Influence & Follow-through',
      score: clampScore(baseScore + (body.mode === 'simulation' ? 3 : 0)),
      weight: 0.3,
    },
    {
      id: 'technical',
      label: 'Technical Rigor',
      score: clampScore(baseScore + (scenario.tags.includes('Architecture') ? 6 : -2)),
      weight: 0.2,
    },
    {
      id: 'tone',
      label: 'Executive Presence',
      score: clampScore(baseScore - (body.mode === 'coaching' ? 2 : 0) + (scenario.difficulty === 'Beginner' ? 4 : 0)),
      weight: 0.15,
    },
  ];

  const weightedOverall = clampScore(
    metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0) /
      metrics.reduce((sum, metric) => sum + metric.weight, 0),
  );

  const overallRating =
    weightedOverall >= 90
      ? 'Exceptional'
      : weightedOverall >= 80
      ? 'Strong'
      : weightedOverall >= 70
      ? 'On track'
      : weightedOverall >= 60
      ? 'Emerging'
      : 'Needs focus';

  const focusMetric = metrics.reduce((lowest, metric) => (metric.score < lowest.score ? metric : lowest), metrics[0]);

  const grammarFeedback = [
    'Watch for long sentences—break complex ideas into shorter statements to keep your reader with you.',
    'Double-check subject-verb agreement when you switch between singular teams and plural squads.',
    'Lean on active voice when describing ownership so stakeholders know who is accountable.',
  ];

  const suggestedPhrasing = [
    '“We will cut integration time by 40% this quarter by focusing platform capacity on the developer onboarding flow.”',
    '“If we defer the migration, we forfeit $1.2M in projected savings and continue paying the coordination tax.”',
    '“The call-to-action for you is to sponsor the cross-functional sprint so we can unblock Procurement by Friday.”',
  ];

  const shareableSummary = `I just completed the “${scenario.title}” practice scenario in ${body.mode} mode and scored ${weightedOverall} (${overallRating}) with ${adjectiveForScore(weightedOverall)} momentum.`;
  const shareUrl = `https://protext.coach/share/${scenario.id}?score=${weightedOverall}`;

  return NextResponse.json({
    scenario: {
      id: scenario.id,
      title: scenario.title,
      persona: scenario.persona,
      difficulty: scenario.difficulty,
      category: scenario.category,
    },
    completedAt: new Date().toISOString(),
    overallScore: weightedOverall,
    overallRating,
    metrics,
    grammarFeedback,
    suggestedPhrasing,
    summary: scenario.summary,
    focusMetric,
    selfRating,
    shareableSummary,
    shareUrl,
  });
}
