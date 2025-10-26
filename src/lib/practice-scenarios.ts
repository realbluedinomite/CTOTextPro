export type PracticeMode = 'simulation' | 'coaching';

export type PracticeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type PracticeScenario = {
  id: string;
  title: string;
  description: string;
  summary: string;
  persona: {
    name: string;
    role: string;
    avatarColor: string;
  };
  category: string;
  difficulty: PracticeDifficulty;
  modes: PracticeMode[];
  tags: string[];
  locked: boolean;
  unlockCriteria?: string;
  analytics: {
    completionRate: number;
    sessionsCompleted: number;
    targetSessions: number;
    avgScore: number;
    unlockMessage?: string;
  };
  introduction: string;
  scenarioPrompts: string[];
  coachingTips: string[];
};

const PRACTICE_SCENARIOS: PracticeScenario[] = [
  {
    id: 'architecture-tradeoff-briefing',
    title: 'Align on an Architecture Trade-off with the CTO',
    description:
      'Frame a decision around migrating from a monolith to services while balancing delivery commitments and platform stability.',
    summary:
      'You are preparing a briefing for Priya, your CTO, who needs a clear recommendation on pursuing a service migration. You must articulate the stakes, proposed mitigations, and how the plan impacts delivery velocity.',
    persona: {
      name: 'Priya Malhotra',
      role: 'Chief Technology Officer',
      avatarColor: 'bg-rose-500',
    },
    category: 'Strategic Alignment',
    difficulty: 'Advanced',
    modes: ['simulation', 'coaching'],
    tags: ['Architecture', 'Stakeholders', 'Risk'],
    locked: false,
    analytics: {
      completionRate: 0.78,
      sessionsCompleted: 4,
      targetSessions: 6,
      avgScore: 82,
    },
    introduction:
      "I'm looking for a crisp recommendation I can take to the board. Walk me through your stance and how you plan to keep delivery risk in check.",
    scenarioPrompts: [
      'Summarise the migration trade-offs in under two minutes.',
      'Highlight the measurable outcomes you are chasing.',
      'Share how you will keep your staff engineers aligned.',
    ],
    coachingTips: [
      'Use numbers to compare the status quo with the proposed change.',
      'Surface risks early, then narrate how your mitigation plan burns them down.',
      'Name the stakeholders affected and how you will keep them informed.',
    ],
  },
  {
    id: 'exec-progress-update',
    title: 'Deliver a Weekly Progress Update to Executives',
    description:
      'Communicate progress, risks, and asks to a cross-functional executive group in a concise written update.',
    summary:
      'Marcus expects a pointed update covering delivery status, key risks, and how product metrics are tracking. Bring him clarity and highlight any executive asks.',
    persona: {
      name: 'Marcus Lee',
      role: 'VP of Engineering',
      avatarColor: 'bg-cyan-500',
    },
    category: 'Status Communication',
    difficulty: 'Intermediate',
    modes: ['simulation', 'coaching'],
    tags: ['Status', 'Leadership', 'Metrics'],
    locked: false,
    analytics: {
      completionRate: 0.64,
      sessionsCompleted: 2,
      targetSessions: 3,
      avgScore: 76,
    },
    introduction:
      'Give me the signal from the noise. Where are we pacing versus plan, and what do you need me to unblock?',
    scenarioPrompts: [
      'Call out metrics that changed materially from last week.',
      'List top three risks with mitigation owners.',
      'Clarify where you need executive input or support.',
    ],
    coachingTips: [
      'Lead with the headline metric and trend so your reader can orient instantly.',
      'Group risks by theme and include the mitigation owner to show accountability.',
      'Finish with explicit asks or next steps to keep momentum.',
    ],
  },
  {
    id: 'incident-coaching-retro',
    title: 'Coach a Staff Engineer Through an Incident Review',
    description:
      'Guide a direct report to extract insights and behaviour changes after a service outage postmortem.',
    summary:
      'Lena is looking for tactical coaching: where should she focus to tighten future incident response, and how can she cascade the learning to the rest of the org?',
    persona: {
      name: 'Lena Ortiz',
      role: 'Director of Platform Engineering',
      avatarColor: 'bg-amber-500',
    },
    category: 'People Leadership',
    difficulty: 'Intermediate',
    modes: ['coaching'],
    tags: ['Coaching', 'Incident Response', 'Growth'],
    locked: false,
    analytics: {
      completionRate: 0.83,
      sessionsCompleted: 5,
      targetSessions: 5,
      avgScore: 88,
    },
    introduction:
      'Help me translate this incident into lasting behaviour so my team responds faster next time.',
    scenarioPrompts: [
      'Identify a concrete behaviour that would have mitigated the incident.',
      'Share a practice Lena can adopt with her team this week.',
      'Coach her on how to socialise the insight without blame.',
    ],
    coachingTips: [
      'Anchor praise first, then shift into actionable feedback.',
      'Offer one behaviour focus per message so Lena can act immediately.',
      'Suggest rituals that reinforce the learning (runbooks, drills, postmortem reviews).',
    ],
  },
  {
    id: 'cfo-headcount-negotiation',
    title: 'Advocate for Headcount with the CFO',
    description:
      'Justify why now is the moment to invest in a platform team, balancing financial constraints with strategic payoff.',
    summary:
      'Amrita will green-light budget only if you quantify ROI and prove the hiring plan protects burn. The conversation hinges on specific financial outcomes.',
    persona: {
      name: 'Amrita Patel',
      role: 'Chief Financial Officer',
      avatarColor: 'bg-violet-500',
    },
    category: 'Executive Influence',
    difficulty: 'Advanced',
    modes: ['simulation'],
    tags: ['Finance', 'Planning', 'Influence'],
    locked: true,
    unlockCriteria: 'Complete three simulation sessions in Strategic Alignment scenarios.',
    analytics: {
      completionRate: 0.0,
      sessionsCompleted: 0,
      targetSessions: 3,
      avgScore: 0,
      unlockMessage: 'Log three architecture or roadmap briefings to demonstrate momentum before tackling budget negotiations.',
    },
    introduction:
      'I trust your product instincts, but numbers win budget. Make the long-term payoff tangible and show me where you will pull spend back if needed.',
    scenarioPrompts: [
      'Summarise the business impact of the proposed hires.',
      'Frame optionality if the investment is delayed.',
      'Quantify how the plan affects burn and gross margin.',
    ],
    coachingTips: [
      'Pair each qualitative benefit with a financial proof point.',
      'Use scenario planning to show you have contingencies if hiring slows.',
      'Tie the investment to revenue efficiency metrics the CFO already tracks.',
    ],
  },
  {
    id: 'product-strategy-story',
    title: 'Craft a Narrative for a Strategy Offsite',
    description:
      'Tell the story of how a new developer productivity initiative ladders to company strategy, bringing product and GTM partners along.',
    summary:
      'You are setting the stage for an offsite. Product, design, and sales leaders need to see how the developer experience work ties to revenue.',
    persona: {
      name: 'Noah Chen',
      role: 'Chief Product Officer',
      avatarColor: 'bg-emerald-500',
    },
    category: 'Narrative Building',
    difficulty: 'Beginner',
    modes: ['simulation', 'coaching'],
    tags: ['Storytelling', 'Product', 'Alignment'],
    locked: true,
    unlockCriteria: 'Finish one coaching session focused on executive storytelling.',
    analytics: {
      completionRate: 0.0,
      sessionsCompleted: 0,
      targetSessions: 1,
      avgScore: 0,
      unlockMessage: 'Complete a storytelling coaching session to unlock strategic narrative practice.',
    },
    introduction:
      'Paint a picture of why this initiative matters commercially and culturally. I need a story everyone can repeat.',
    scenarioPrompts: [
      'Open with the customer pain you are alleviating.',
      'Connect the initiative to revenue and retention goals.',
      'Invite partners into the story with a clear call to action.',
    ],
    coachingTips: [
      'Lean on contrast—describe today versus the world after the initiative lands.',
      'Use vivid verbs and metaphors to keep attention high.',
      'Close with a memorable line that peers can reuse.',
    ],
  },
];

export function getPracticeScenarios() {
  return PRACTICE_SCENARIOS;
}

export function findPracticeScenarioById(id: string) {
  return PRACTICE_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}
