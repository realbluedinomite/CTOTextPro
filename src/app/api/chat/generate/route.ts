import { NextResponse } from 'next/server';

import { AuthenticationError, requireAuthenticatedUser } from '@/lib/auth/server';
import {
  findPracticeScenarioById,
  type PracticeDifficulty,
  type PracticeMode,
} from '@/lib/practice-scenarios';

type GenerateChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type GenerateChatRequest = {
  scenarioId: string;
  messages: GenerateChatMessage[];
  mode: PracticeMode;
  difficulty: PracticeDifficulty;
};

type StreamPayload =
  | {
      type: 'content';
      delta: string;
    }
  | {
      type: 'message';
      message: {
        role: 'assistant';
        content: string;
      };
    }
  | {
      type: 'tip';
      tip: string;
    }
  | {
      type: 'done';
    }
  | {
      type: 'error';
      error: string;
    };

const encoder = new TextEncoder();

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    throw error;
  }

  let body: GenerateChatRequest | null = null;

  try {
    body = (await request.json()) as GenerateChatRequest;
  } catch (error) {
    console.error('Failed to parse /api/chat/generate payload', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body || !body.scenarioId || !Array.isArray(body.messages) || !body.mode || !body.difficulty) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const scenario = findPracticeScenarioById(body.scenarioId);

  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  const lastUserMessage = [...body.messages].reverse().find((message) => message.role === 'user');

  const personaFirstName = scenario.persona.name.split(' ')[0];
  const userExcerpt = lastUserMessage?.content.replace(/\s+/g, ' ').slice(0, 220) ?? '';

  const difficultyToneMap: Record<PracticeDifficulty, string> = {
    Beginner: 'Keep the tone approachable and scaffold the context so newcomers understand what is at stake.',
    Intermediate: 'Bring clarity by connecting actions to impact while keeping the momentum high.',
    Advanced:
      'Assume the reader is an executive peer: get to the strategic heart quickly and quantify the payoff.',
  };

  const modeIntro: Record<PracticeMode, string> = {
    simulation:
      `${personaFirstName} responds directly to your prompt, mirroring how they would engage during a live discussion.`,
    coaching:
      `${personaFirstName} offers coaching guidance alongside your message so you can sharpen your framing before sending it to stakeholders.`,
  };

  const reflectiveNudge = body.mode === 'coaching'
    ? 'Notice where your draft already shines, then tighten the moments that feel vague or assumption-heavy.'
    : 'Stay crisp on the "so what"—the team needs to know exactly why this decision matters right now.';

  const assistantResponse = [
    `Here is how ${personaFirstName} would build on your latest draft${userExcerpt ? `: "${userExcerpt}"` : ''}.`,
    difficultyToneMap[body.difficulty],
    modeIntro[body.mode],
    'Anchor the update in the outcome the leadership team already cares deeply about, and make the next decision unavoidable.',
    reflectiveNudge,
  ]
    .filter(Boolean)
    .join(' ');

  const sentences = assistantResponse.match(/[^.!?]+[.!?]+/g) ?? [assistantResponse];

  const tipsPool = scenario.coachingTips;
  const selectedTip = body.mode === 'coaching' && tipsPool.length > 0
    ? tipsPool[Math.floor(Math.random() * tipsPool.length)]
    : null;

  const queuedPayloads: { delay: number; payload: StreamPayload }[] = sentences.map((sentence, index) => ({
    delay: index * 320,
    payload: {
      type: 'content',
      delta: sentence.trim() + ' ',
    },
  }));

  queuedPayloads.push({
    delay: sentences.length * 320,
    payload: {
      type: 'message',
      message: {
        role: 'assistant',
        content: assistantResponse,
      },
    },
  });

  if (selectedTip) {
    queuedPayloads.push({
      delay: sentences.length * 320 + 240,
      payload: {
        type: 'tip',
        tip: selectedTip,
      },
    });
  }

  queuedPayloads.push({
    delay: sentences.length * 320 + 480,
    payload: { type: 'done' },
  });

  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      queuedPayloads.forEach(({ delay, payload }, index) => {
        const timeout = setTimeout(() => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));

          if (index === queuedPayloads.length - 1) {
            controller.close();
          }
        }, delay);

        timeouts.push(timeout);
      });
    },
    cancel() {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  });
}
