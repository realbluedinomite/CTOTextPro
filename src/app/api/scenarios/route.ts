import { NextResponse } from 'next/server';

import { AuthenticationError, requireAuthenticatedUser } from '@/lib/auth/server';
import { getPracticeScenarios } from '@/lib/practice-scenarios';

export async function GET() {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    throw error;
  }

  const scenarios = getPracticeScenarios();

  const personas = Array.from(new Set(scenarios.map((scenario) => scenario.persona.name)));
  const categories = Array.from(new Set(scenarios.map((scenario) => scenario.category)));
  const difficulties = Array.from(new Set(scenarios.map((scenario) => scenario.difficulty)));
  const modes = Array.from(new Set(scenarios.flatMap((scenario) => scenario.modes)));

  return NextResponse.json({
    scenarios,
    filters: {
      personas,
      categories,
      difficulties,
      modes,
    },
  });
}
