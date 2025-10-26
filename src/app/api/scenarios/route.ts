import { NextResponse } from 'next/server';

import { getPracticeScenarios } from '@/lib/practice-scenarios';

export async function GET() {
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
