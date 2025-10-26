'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  PracticeDifficulty,
  PracticeMode,
  PracticeScenario,
} from '@/lib/practice-scenarios';

type ScenarioFilterOptions = {
  personas: string[];
  categories: string[];
  difficulties: PracticeDifficulty[];
  modes: PracticeMode[];
};

type FiltersState = {
  persona: string;
  category: string;
  difficulty: PracticeDifficulty | 'all';
  mode: PracticeMode | 'all';
  search: string;
};

type ChatMessageRole = 'user' | 'persona' | 'coach';

type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: number;
  personaName?: string;
};

type StreamPayload =
  | { type: 'content'; delta: string }
  | { type: 'message'; message: { role: 'assistant'; content: string } }
  | { type: 'tip'; tip: string }
  | { type: 'error'; error: string }
  | { type: 'done' };

type EvaluationMetric = {
  id: string;
  label: string;
  score: number;
  weight: number;
};

type EvaluationResult = {
  scenario: {
    id: string;
    title: string;
    persona: PracticeScenario['persona'];
    difficulty: PracticeDifficulty;
    category: string;
  };
  completedAt: string;
  overallScore: number;
  overallRating: string;
  metrics: EvaluationMetric[];
  grammarFeedback: string[];
  suggestedPhrasing: string[];
  summary: string;
  focusMetric: EvaluationMetric;
  selfRating: number;
  shareableSummary: string;
  shareUrl: string;
};

const MAX_RENDERED_MESSAGES = 40;

const defaultFilters: FiltersState = {
  persona: 'all',
  category: 'all',
  difficulty: 'all',
  mode: 'all',
  search: '',
};

const ratingDescriptions: Record<number, string> = {
  1: 'Very low confidence',
  2: 'Some uncertainty',
  3: 'Neutral confidence',
  4: 'Mostly confident',
  5: 'Extremely confident',
};

const difficultyStyles: Record<PracticeDifficulty, string> = {
  Beginner: 'bg-emerald-500/10 text-emerald-600',
  Intermediate: 'bg-amber-500/10 text-amber-600',
  Advanced: 'bg-rose-500/10 text-rose-500',
};

const modeLabels: Record<PracticeMode, string> = {
  coaching: 'Coaching',
  simulation: 'Simulation',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function normaliseMessagesForRequest(history: ChatMessage[]) {
  return history.map((message) => {
    if (message.role === 'user') {
      return { role: 'user' as const, content: message.content };
    }

    if (message.role === 'persona') {
      return { role: 'assistant' as const, content: message.content };
    }

    return { role: 'system' as const, content: message.content };
  });
}

export default function PracticePage() {
  const [scenarios, setScenarios] = useState<PracticeScenario[]>([]);
  const [filterOptions, setFilterOptions] = useState<ScenarioFilterOptions | null>(null);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const [mode, setMode] = useState<PracticeMode>('simulation');
  const [composerDifficulty, setComposerDifficulty] = useState<PracticeDifficulty>('Intermediate');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [retryContext, setRetryContext] = useState<{
    prompt: string;
    history: ChatMessage[];
  } | null>(null);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [selfRating, setSelfRating] = useState(3);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const isStreamingRef = useRef(isStreaming);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    let cancelled = false;

    async function loadScenarios() {
      setLoadingScenarios(true);
      setScenarioError(null);

      try {
        const response = await fetch('/api/scenarios', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        setScenarios(data.scenarios as PracticeScenario[]);
        setFilterOptions(data.filters as ScenarioFilterOptions);

        const firstUnlocked = (data.scenarios as PracticeScenario[]).find((scenario) => !scenario.locked);
        setSelectedScenarioId((prev) => prev ?? firstUnlocked?.id ?? null);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setScenarioError('We were unable to load scenarios. Please refresh to try again.');
        }
      } finally {
        if (!cancelled) {
          setLoadingScenarios(false);
        }
      }
    }

    loadScenarios();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null,
    [scenarios, selectedScenarioId],
  );

  useEffect(() => {
    if (!selectedScenario) {
      return;
    }

    setMode((currentMode) =>
      selectedScenario.modes.includes(currentMode) ? currentMode : selectedScenario.modes[0] ?? 'simulation',
    );
    setComposerDifficulty(selectedScenario.difficulty);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'persona',
        content: selectedScenario.introduction,
        createdAt: Date.now(),
        personaName: selectedScenario.persona.name,
      },
    ]);
    setInputValue('');
    setSelfRating(3);
    setShowAllMessages(false);
    setSessionComplete(false);
    setEvaluation(null);
    setStreamError(null);
    setRetryContext(null);
  }, [selectedScenario?.id]);

  useEffect(() => {
    const container = transcriptRef.current;

    if (!container) {
      return;
    }

    const isNearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 120;

    if (isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter((scenario) => {
      if (filters.persona !== 'all' && scenario.persona.name !== filters.persona) {
        return false;
      }

      if (filters.category !== 'all' && scenario.category !== filters.category) {
        return false;
      }

      if (filters.difficulty !== 'all' && scenario.difficulty !== filters.difficulty) {
        return false;
      }

      if (filters.mode !== 'all' && !scenario.modes.includes(filters.mode)) {
        return false;
      }

      if (filters.search.trim().length > 0) {
        const haystack = `${scenario.title} ${scenario.description} ${scenario.summary}`.toLowerCase();
        if (!haystack.includes(filters.search.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [filters, scenarios]);

  const visibleMessages = useMemo(() => {
    if (showAllMessages) {
      return messages;
    }

    if (messages.length <= MAX_RENDERED_MESSAGES) {
      return messages;
    }

    return messages.slice(messages.length - MAX_RENDERED_MESSAGES);
  }, [messages, showAllMessages]);

  const hiddenMessageCount = showAllMessages ? 0 : messages.length - visibleMessages.length;

  const handleTranscriptScroll = useCallback(() => {
    if (!transcriptRef.current) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = transcriptRef.current;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 80;

    if (isAtBottom && !isStreaming) {
      transcriptRef.current.scrollTo({ top: scrollHeight });
    }
  }, [isStreaming]);

  const handleSendMessage = useCallback(
    async (prompt: string, options?: { isRetry?: boolean; historyOverride?: ChatMessage[] }) => {
      if (!selectedScenario || sessionComplete) {
        return;
      }

      const trimmedPrompt = prompt.trim();

      if (trimmedPrompt.length === 0) {
        return;
      }

      if (isStreamingRef.current) {
        return;
      }

      const baseHistory = options?.historyOverride ? [...options.historyOverride] : [...messagesRef.current];

      let userMessage: ChatMessage | undefined;
      let requestHistory: ChatMessage[] = baseHistory;

      if (!options?.isRetry) {
        userMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: trimmedPrompt,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage!]);
        requestHistory = [...baseHistory, userMessage];
      }

      const placeholderId = crypto.randomUUID();
      const placeholder: ChatMessage = {
        id: placeholderId,
        role: 'persona',
        content: '',
        createdAt: Date.now(),
        personaName: selectedScenario.persona.name,
      };

      setMessages((prev) => [...prev, placeholder]);

      setIsStreaming(true);
      setStreamError(null);
      setRetryContext(null);

      try {
        const response = await fetch('/api/chat/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scenarioId: selectedScenario.id,
            messages: normaliseMessagesForRequest(requestHistory),
            mode,
            difficulty: composerDifficulty,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to stream response');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffered = '';
        let assembledContent = '';

        const applyStreamEvent = (event: StreamPayload) => {
          if (event.type === 'content') {
            assembledContent += event.delta;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === placeholderId
                  ? {
                      ...message,
                      content: assembledContent,
                    }
                  : message,
              ),
            );
            return;
          }

          if (event.type === 'message') {
            assembledContent = event.message.content;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === placeholderId ? { ...message, content: assembledContent } : message,
              ),
            );
            return;
          }

          if (event.type === 'tip') {
            const tipMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'coach',
              content: event.tip,
              createdAt: Date.now(),
              personaName: 'Coaching tip',
            };

            setMessages((prev) => [...prev, tipMessage]);
            return;
          }

          if (event.type === 'error') {
            throw new Error(event.error);
          }
        };

        const processBuffered = () => {
          const segments = buffered.split('\n');
          buffered = segments.pop() ?? '';

          for (const segment of segments) {
            if (!segment.trim()) {
              continue;
            }

            try {
              const event = JSON.parse(segment) as StreamPayload;
              applyStreamEvent(event);
            } catch (error) {
              console.error('Failed to parse stream chunk', error);
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            buffered += decoder.decode(value, { stream: true });
            processBuffered();
          }

          if (done) {
            break;
          }
        }

        buffered += decoder.decode();
        processBuffered();

        if (buffered.trim()) {
          try {
            const event = JSON.parse(buffered) as StreamPayload;
            applyStreamEvent(event);
          } catch (error) {
            console.error('Failed to parse remaining stream chunk', error);
          }
        }

        if (!assembledContent.trim()) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === placeholderId
                ? {
                    ...message,
                    content: 'Thanks—let’s keep iterating toward a crisp executive update.',
                  }
                : message,
            ),
          );
        }
      } catch (error) {
        console.error('Streaming error', error);
        setMessages((prev) => prev.filter((message) => message.id !== placeholderId));
        setStreamError('We lost the connection while generating a response. Retry to continue the session.');
        setRetryContext({
          prompt: trimmedPrompt,
          history: [...requestHistory],
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [composerDifficulty, mode, selectedScenario, sessionComplete],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = inputValue.trim();

      if (!trimmed) {
        return;
      }

      setInputValue('');
      await handleSendMessage(trimmed);
    },
    [handleSendMessage, inputValue],
  );

  const handleRetry = useCallback(async () => {
    if (!retryContext) {
      return;
    }

    await handleSendMessage(retryContext.prompt, {
      isRetry: true,
      historyOverride: retryContext.history,
    });
  }, [handleSendMessage, retryContext]);

  const handleEvaluate = useCallback(async () => {
    if (!selectedScenario || sessionComplete) {
      return;
    }

    if (isStreamingRef.current) {
      return;
    }

    if (!messages.some((message) => message.role === 'user')) {
      setStreamError('Share at least one message with the persona before requesting feedback.');
      return;
    }

    setIsEvaluating(true);
    setStreamError(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          transcript: messages.map(({ role, content }) => ({ role, content })),
          mode,
          difficulty: composerDifficulty,
          selfRating,
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed with status ${response.status}`);
      }

      const data = (await response.json()) as EvaluationResult;
      setEvaluation(data);
      setSessionComplete(true);
    } catch (error) {
      console.error('Evaluation error', error);
      setStreamError('Evaluation request failed. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  }, [composerDifficulty, messages, mode, selectedScenario, selfRating, sessionComplete]);

  const handleCopySummary = useCallback(async () => {
    if (!evaluation) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(`${evaluation.shareableSummary}\n${evaluation.shareUrl}`);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (error) {
      console.error('Clipboard copy failed', error);
      setCopySuccess(false);
    }
  }, [evaluation]);

  const filterOptionValues = useMemo(() => {
    return {
      personas: filterOptions?.personas ?? [],
      categories: filterOptions?.categories ?? [],
      difficulties:
        filterOptions?.difficulties ?? (['Beginner', 'Intermediate', 'Advanced'] as PracticeDifficulty[]),
      modes: filterOptions?.modes ?? (['simulation', 'coaching'] as PracticeMode[]),
    };
  }, [filterOptions]);

  const dynamicTips = useMemo(
    () => messages.filter((message) => message.role === 'coach'),
    [messages],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Practice</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Choose a scenario, sharpen your draft with real-time coaching, and finish with structured feedback—all without
          leaving this workspace.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filters</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-persona">
                  Persona
                </label>
                <select
                  id="filter-persona"
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={filters.persona}
                  onChange={(event) => setFilters((prev) => ({ ...prev, persona: event.target.value }))}
                >
                  <option value="all">All personas</option>
                  {filterOptionValues.personas.map((persona) => (
                    <option key={persona} value={persona}>
                      {persona}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-category">
                  Category
                </label>
                <select
                  id="filter-category"
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={filters.category}
                  onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                >
                  <option value="all">All categories</option>
                  {filterOptionValues.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-difficulty">
                  Difficulty
                </label>
                <select
                  id="filter-difficulty"
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={filters.difficulty}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, difficulty: event.target.value as FiltersState['difficulty'] }))
                  }
                >
                  <option value="all">All difficulty levels</option>
                  {filterOptionValues.difficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-mode">
                  Mode
                </label>
                <select
                  id="filter-mode"
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={filters.mode}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, mode: event.target.value as FiltersState['mode'] }))
                  }
                >
                  <option value="all">All modes</option>
                  {filterOptionValues.modes.map((modeOption) => (
                    <option key={modeOption} value={modeOption}>
                      {modeLabels[modeOption]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="sr-only" htmlFor="filter-search">
                  Search scenarios
                </label>
                <Input
                  id="filter-search"
                  placeholder="Search scenario titles, personas, or keywords"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className="rounded-xl border-border/60 bg-background"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scenarios</h2>
              <span className="text-xs text-muted-foreground">
                {filteredScenarios.length} of {scenarios.length} available
              </span>
            </div>

            {scenarioError && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
                <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                <span>{scenarioError}</span>
              </div>
            )}

            {loadingScenarios ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={`scenario-skeleton-${index}`}
                    className="h-32 animate-pulse rounded-3xl border border-border/60 bg-muted/30"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredScenarios.map((scenario) => {
                  const isSelected = selectedScenario?.id === scenario.id;

                  return (
                    <div
                      key={scenario.id}
                      role="button"
                      tabIndex={scenario.locked ? -1 : 0}
                      aria-disabled={scenario.locked}
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (scenario.locked) {
                          return;
                        }
                        setSelectedScenarioId(scenario.id);
                      }}
                      onKeyDown={(event) => {
                        if (scenario.locked) {
                          return;
                        }
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedScenarioId(scenario.id);
                        }
                      }}
                      className={cn(
                        'w-full rounded-3xl border bg-card p-5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                        isSelected
                          ? 'border-primary/70 shadow-[0_12px_40px_0_rgba(59,130,246,0.08)]'
                          : 'border-border/70',
                        !scenario.locked && !isSelected && 'hover:border-primary/50 hover:bg-card/80',
                        scenario.locked && 'cursor-not-allowed border-dashed opacity-60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <span>{scenario.category}</span>
                            <span>•</span>
                            <span>{scenario.persona.role}</span>
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-foreground">{scenario.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{scenario.description}</p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold shadow-sm',
                            difficultyStyles[scenario.difficulty],
                          )}
                        >
                          {scenario.difficulty}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {scenario.analytics.sessionsCompleted}/{scenario.analytics.targetSessions} goal sessions
                        </span>
                        <span>•</span>
                        <span>Avg score {scenario.analytics.avgScore}</span>
                        <span>•</span>
                        <span>{Math.round(scenario.analytics.completionRate * 100)}% completion rate</span>
                      </div>

                      {scenario.locked ? (
                        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
                          <Lock className="mt-0.5 h-4 w-4" aria-hidden="true" />
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">Locked scenario</p>
                            <p>{scenario.unlockCriteria}</p>
                            {scenario.analytics.unlockMessage && <p className="text-[11px] text-muted-foreground/80">{scenario.analytics.unlockMessage}</p>}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {scenario.modes.map((scenarioMode) => (
                              <span
                                key={scenarioMode}
                                className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 font-medium"
                              >
                                {modeLabels[scenarioMode]}
                              </span>
                            ))}
                          </div>
                          <Button size="sm" variant={isSelected ? 'default' : 'outline'}>
                            {isSelected ? 'Selected' : 'Preview scenario'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredScenarios.length === 0 && !loadingScenarios && (
                  <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    No scenarios match your filters yet. Adjust the filters or clear the search to explore the full catalog.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-[680px] flex-col rounded-3xl border border-border/70 bg-card shadow-sm">
          {selectedScenario ? (
            <div className="flex h-full flex-col">
              <div className="flex flex-col gap-4 border-b border-border/60 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm',
                        selectedScenario.persona.avatarColor,
                      )}
                    >
                      {getInitials(selectedScenario.persona.name)}
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {selectedScenario.persona.role}
                      </p>
                      <p className="text-sm font-semibold text-foreground">{selectedScenario.persona.name}</p>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{selectedScenario.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedScenario.summary}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {modeLabels[mode]}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                      difficultyStyles[composerDifficulty],
                    )}
                  >
                    {composerDifficulty}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-5 lg:flex-row">
                <div className="flex flex-1 flex-col">
                  <div
                    ref={transcriptRef}
                    onScroll={handleTranscriptScroll}
                    className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border/60 bg-muted/20 p-4"
                  >
                    {hiddenMessageCount > 0 && (
                      <div className="flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAllMessages(true)}
                          className="text-xs"
                        >
                          Show {hiddenMessageCount} earlier messages
                        </Button>
                      </div>
                    )}

                    {visibleMessages.map((message) => {
                      const isUser = message.role === 'user';
                      const isCoach = message.role === 'coach';

                      return (
                        <div
                          key={message.id}
                          className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
                        >
                          {!isUser && (
                            <div
                              className={cn(
                                'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                                isCoach ? 'bg-indigo-500' : selectedScenario.persona.avatarColor,
                              )}
                            >
                              {isCoach ? 'Tip' : getInitials(message.personaName ?? selectedScenario.persona.name)}
                            </div>
                          )}
                          <div
                            className={cn(
                              'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                              isUser
                                ? 'rounded-br-sm bg-primary text-primary-foreground'
                                : isCoach
                                ? 'rounded-bl-sm border border-indigo-500/30 bg-indigo-500/10 text-indigo-600'
                                : 'rounded-bl-sm border border-border/60 bg-card text-foreground',
                            )}
                          >
                            {message.content.split('\n').map((paragraph, index) => (
                              <p key={`${message.id}-${index}`} className={index > 0 ? 'mt-2' : undefined}>
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {isStreaming && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        {selectedScenario.persona.name} is drafting a response…
                      </div>
                    )}
                  </div>

                  {streamError && (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                      <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                      <div className="space-y-1">
                        <p>{streamError}</p>
                        {retryContext && (
                          <Button size="sm" variant="outline" onClick={handleRetry} className="h-7 text-xs">
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Retry response
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {evaluation && sessionComplete && (
                    <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700">
                      <div className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Session marked complete — review your feedback below.
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="practice-message" className="sr-only">
                        Compose your response
                      </label>
                      <textarea
                        id="practice-message"
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        placeholder="Draft your next message. Shift + Enter for a new line."
                        className="min-h-[140px] w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        disabled={sessionComplete}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            const draft = inputValue.trim();
                            if (draft) {
                              setInputValue('');
                              void handleSendMessage(draft);
                            }
                          }
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={voiceEnabled ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setVoiceEnabled((value) => !value)}
                          className="h-9"
                          disabled={sessionComplete}
                        >
                          {voiceEnabled ? (
                            <Mic className="mr-2 h-4 w-4" aria-hidden="true" />
                          ) : (
                            <MicOff className="mr-2 h-4 w-4" aria-hidden="true" />
                          )}
                          {voiceEnabled ? 'Voice on' : 'Voice off'}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Voice capture {voiceEnabled ? 'ready' : 'coming soon'}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                        <select
                          className="rounded-xl border border-border/60 bg-background px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={mode}
                          onChange={(event) => setMode(event.target.value as PracticeMode)}
                        >
                          {selectedScenario.modes.map((scenarioMode) => (
                            <option key={scenarioMode} value={scenarioMode}>
                              {modeLabels[scenarioMode]}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-xl border border-border/60 bg-background px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={composerDifficulty}
                          onChange={(event) =>
                            setComposerDifficulty(event.target.value as PracticeDifficulty)
                          }
                        >
                          {filterOptionValues.difficulties.map((difficulty) => (
                            <option key={difficulty} value={difficulty}>
                              {difficulty}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" disabled={sessionComplete || isStreaming}>
                          Send
                          <Send className="ml-2 h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">How confident did you feel?</p>
                        <p className="text-xs text-muted-foreground">{ratingDescriptions[selfRating]}</p>
                      </div>
                      <div className="flex flex-1 items-center gap-3 sm:max-w-xs">
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={selfRating}
                          onChange={(event) => setSelfRating(Number(event.target.value))}
                          disabled={sessionComplete}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-sm font-semibold text-foreground">{selfRating}/5</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleEvaluate}
                        disabled={sessionComplete || isStreaming || isEvaluating || !messages.some((message) => message.role === 'user')}
                      >
                        {isEvaluating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            Evaluating…
                          </>
                        ) : (
                          'End session & evaluate'
                        )}
                      </Button>
                      {isStreaming && (
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Persona is responding…
                        </span>
                      )}
                    </div>
                  </form>

                  {evaluation && (
                    <div className="mt-6 space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Session feedback</p>
                          <h3 className="text-xl font-semibold text-foreground">Overall {evaluation.overallScore} — {evaluation.overallRating}</h3>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleCopySummary}>
                          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                          Copy summary
                        </Button>
                      </div>
                      {copySuccess && (
                        <p className="text-xs font-medium text-emerald-600">Copied! Share your progress with your team.</p>
                      )}
                      <div className="space-y-3">
                        {evaluation.metrics.map((metric) => (
                          <div key={metric.id}>
                            <div className="flex items-center justify-between text-sm text-foreground">
                              <span className="font-medium">{metric.label}</span>
                              <span className="text-muted-foreground">{metric.score}</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-border/40">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${Math.min(100, Math.max(0, metric.score))}%` }}
                                role="progressbar"
                                aria-valuenow={metric.score}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${metric.label} score`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Focus next on {evaluation.focusMetric.label}</p>
                        <p className="mt-1 text-sm">
                          Your confidence self-rating: <span className="font-semibold text-foreground">{evaluation.selfRating}/5</span>
                        </p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-foreground">Grammar feedback</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {evaluation.grammarFeedback.map((feedback, index) => (
                              <li key={`grammar-${index}`} className="rounded-xl border border-border/50 bg-card p-3">
                                {feedback}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-foreground">Suggested phrasing</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {evaluation.suggestedPhrasing.map((suggestion, index) => (
                              <li key={`suggestion-${index}`} className="rounded-xl border border-border/50 bg-card p-3">
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Shareable summary</p>
                        <p className="mt-1">{evaluation.shareableSummary}</p>
                        <a
                          href={evaluation.shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center text-xs font-medium text-primary hover:underline"
                        >
                          View share link
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {mode === 'coaching' && (
                  <aside className="rounded-3xl border border-border/60 bg-muted/20 p-5 text-sm">
                    <h3 className="text-sm font-semibold text-foreground">Coaching tips</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use these prompts to tighten your next draft before you send it to stakeholders.
                    </p>
                    <div className="mt-4 space-y-3">
                      {selectedScenario.coachingTips.map((tip, index) => (
                        <div key={`static-tip-${index}`}
                          className="rounded-2xl border border-border/60 bg-card p-3 text-sm text-muted-foreground"
                        >
                          {tip}
                        </div>
                      ))}
                    </div>
                    {dynamicTips.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Live nudges
                        </p>
                        {dynamicTips.map((tip) => (
                          <div key={tip.id} className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-3 text-sm text-indigo-600">
                            {tip.content}
                          </div>
                        ))}
                      </div>
                    )}
                  </aside>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Select a scenario to get started</h2>
                <p className="text-sm text-muted-foreground">
                  Filter by persona, category, or difficulty. Once you choose a scenario, you&apos;ll see the chat workspace and
                  can begin drafting immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
