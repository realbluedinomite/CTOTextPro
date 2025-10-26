import { DifficultyLevel, Persona, Prisma, PrismaClient, ScenarioCategory } from '@prisma/client';

const prisma = new PrismaClient();

type PersonaDifficulty = {
  level: DifficultyLevel;
  guidance: string;
  focus: string;
};

type PersonaSeed = {
  slug: string;
  name: string;
  toneGuidance: string;
  samplePrompts: string[];
  difficultyLevels: PersonaDifficulty[];
  avatarUrl: string;
  tags: string[];
};

type ScenarioSeed = {
  slug: string;
  title: string;
  description: string;
  objective: string;
  category: ScenarioCategory;
  basePrompts: string[];
  defaultDifficulty: DifficultyLevel;
  unlockLevel: number;
  recommendedPersonaSlug?: string;
};

type BadgeSeed = {
  code: string;
  name: string;
  description: string;
  unlockRules?: Prisma.InputJsonValue;
};

const personaSeeds: PersonaSeed[] = [
  {
    slug: 'hr-manager',
    name: 'HR Manager',
    toneGuidance:
      'Professional, structured, and fair. Prioritises clarity, consistency, and measurable outcomes when evaluating responses.',
    samplePrompts: [
      'Walk me through how you handled a challenging performance conversation with a direct report.',
      'Explain how you align hiring decisions with the long-term talent strategy for your organisation.',
      'Describe a time you had to balance employee advocacy with executive expectations.',
    ],
    difficultyLevels: [
      {
        level: DifficultyLevel.BEGINNER,
        guidance: 'Stay grounded in fundamentals like STAR framing and policy basics to demonstrate structured thinking.',
        focus: 'Clear timelines, role clarity, and the immediate outcome of your actions.',
      },
      {
        level: DifficultyLevel.INTERMEDIATE,
        guidance: 'Layer in metrics, stakeholder alignment, and how you reinforced learnings with your team.',
        focus: 'Highlight collaboration with hiring managers and feedback loops that improved programs.',
      },
      {
        level: DifficultyLevel.ADVANCED,
        guidance: 'Anticipate follow-up questions around compliance, change management, and culture impact.',
        focus: 'Discuss long-term talent health indicators and how you iterate on people strategies.',
      },
    ],
    avatarUrl: '/avatars/persona-hr-manager.png',
    tags: ['people-leadership', 'structured', 'behavioral'],
  },
  {
    slug: 'recruiter',
    name: 'Recruiter',
    toneGuidance:
      'Energetic, curious, and candidate-focused. Values rapport-building and concise storytelling that sells the opportunity.',
    samplePrompts: [
      'How do you position our team to senior candidates who have multiple offers?',
      'Share an example of reviving a stalled hiring pipeline and the tactics you used.',
      "What signals do you look for to decide whether a candidate is a strong culture add?",
    ],
    difficultyLevels: [
      {
        level: DifficultyLevel.BEGINNER,
        guidance: 'Emphasise enthusiasm, clarity, and foundational recruiting metrics to create trust quickly.',
        focus: 'First response blurbs, screening criteria, and signal capture in the ATS.',
      },
      {
        level: DifficultyLevel.INTERMEDIATE,
        guidance: 'Balance storytelling with measurable impact while reflecting on candidate experience.',
        focus: 'Experimentation in outreach, nurture sequences, and collaborating with hiring managers.',
      },
      {
        level: DifficultyLevel.ADVANCED,
        guidance: 'Address objections, competitive intelligence, and executive stakeholder management head-on.',
        focus: 'Narratives that blend brand positioning with data-driven pipeline health insights.',
      },
    ],
    avatarUrl: '/avatars/persona-recruiter.png',
    tags: ['talent', 'outbound', 'pitching'],
  },
  {
    slug: 'colleague',
    name: 'Colleague',
    toneGuidance:
      'Supportive but candid peer who values collaboration, learning, and mutual accountability.',
    samplePrompts: [
      'How can we improve our cross-team handoff so launches feel less last-minute?',
      'Tell me about a project where our communication broke down and what you would change.',
      'What feedback do you have about my collaboration style when timelines are tight?',
    ],
    difficultyLevels: [
      {
        level: DifficultyLevel.BEGINNER,
        guidance: 'Focus on empathy, active listening, and a shared problem-solving mindset.',
        focus: 'Identify friction points without blame and propose one actionable improvement.',
      },
      {
        level: DifficultyLevel.INTERMEDIATE,
        guidance: 'Balance vulnerability with data and outline rituals to keep collaboration healthy.',
        focus: 'Highlight retro learnings, working agreements, and stakeholder mapping.',
      },
      {
        level: DifficultyLevel.ADVANCED,
        guidance: 'Navigate conflict directly while reinforcing trust and long-term accountability.',
        focus: 'Escalation pathways, mediation strategies, and how you restored momentum.',
      },
    ],
    avatarUrl: '/avatars/persona-colleague.png',
    tags: ['collaboration', 'peer-feedback', 'retrospective'],
  },
  {
    slug: 'client',
    name: 'Client',
    toneGuidance:
      'Outcome-driven and pragmatic. Expects clarity, proactive communication, and tangible business results.',
    samplePrompts: [
      'Summarise the current project status, including risks I should be aware of.',
      'How will this proposed change impact the KPIs we aligned on last quarter?',
      'Describe how you handled a misalignment between our expectations and the delivered work.',
    ],
    difficultyLevels: [
      {
        level: DifficultyLevel.BEGINNER,
        guidance: 'Lead with concise context setting and reiterate agreed-upon goals.',
        focus: 'Highlight the immediate impact to the client and outline next steps clearly.',
      },
      {
        level: DifficultyLevel.INTERMEDIATE,
        guidance: 'Bring scenario planning and stakeholder updates to the conversation.',
        focus: 'Show how you manage scope, communicate trade-offs, and keep trust high.',
      },
      {
        level: DifficultyLevel.ADVANCED,
        guidance: 'Demonstrate executive presence, negotiation savvy, and proactive risk mitigation.',
        focus: 'Quantify ROI, describe remediation plans, and align on a forward-looking cadence.',
      },
    ],
    avatarUrl: '/avatars/persona-client.png',
    tags: ['external', 'consultative', 'stakeholder'],
  },
];

const scenarioSeeds: ScenarioSeed[] = [
  {
    slug: 'behavioral-interview-warmup',
    title: 'Behavioral Interview Warm-Up',
    description:
      'Prepare for people-team interviews by practising structured responses with a seasoned HR Manager persona.',
    objective:
      'Demonstrate mastery of the STAR method while highlighting impact, stakeholder management, and follow-through.',
    category: ScenarioCategory.INTERVIEWS,
    basePrompts: [
      'Share a concise STAR-formatted answer to a question about leading change across teams.',
      'Describe a time you disagreed with leadership and how you navigated the conversation constructively.',
      'Explain how you measure success for a people initiative once it launches.',
    ],
    defaultDifficulty: DifficultyLevel.INTERMEDIATE,
    unlockLevel: 0,
    recommendedPersonaSlug: 'hr-manager',
  },
  {
    slug: 'product-collaboration-retro',
    title: 'Product Collaboration Retro',
    description:
      'Reflect on a cross-functional launch with a trusted colleague to surface learnings and set new rituals.',
    objective:
      'Practice giving and receiving feedback that balances empathy with accountability to keep teams aligned.',
    category: ScenarioCategory.WORKPLACE,
    basePrompts: [
      'Identify one collaboration moment that worked well and one that created friction.',
      'Propose a working agreement that protects focus time without slowing decisions.',
      'Outline how you will keep stakeholders informed during the next launch cycle.',
    ],
    defaultDifficulty: DifficultyLevel.INTERMEDIATE,
    unlockLevel: 2,
    recommendedPersonaSlug: 'colleague',
  },
  {
    slug: 'strategic-networking-intros',
    title: 'Strategic Networking Intros',
    description:
      'Practise concise and compelling introductions before a conference or industry meetup.',
    objective:
      'Craft narratives that communicate who you are, what you are building, and the value you offer potential connections.',
    category: ScenarioCategory.NETWORKING,
    basePrompts: [
      'Give a 30-second summary of your current role and mission that invites follow-up questions.',
      'Share a recent win that illustrates your unique approach or leadership style.',
      'Ask for a warm introduction or next step in a way that feels natural, not transactional.',
    ],
    defaultDifficulty: DifficultyLevel.BEGINNER,
    unlockLevel: 1,
    recommendedPersonaSlug: 'recruiter',
  },
  {
    slug: 'client-escalation-briefing',
    title: 'Client Escalation Briefing',
    description:
      'Rehearse handling a high-stakes escalation with an enterprise client stakeholder.',
    objective:
      'Rebuild confidence by communicating risk, remediation, and measurable impact with executive-level clarity.',
    category: ScenarioCategory.CLIENT,
    basePrompts: [
      'Summarise the escalation, highlighting the business impact and root cause in under two minutes.',
      'Present your remediation plan, including owners, timelines, and mitigation checkpoints.',
      'Set expectations for follow-up communication and what success looks like post-resolution.',
    ],
    defaultDifficulty: DifficultyLevel.ADVANCED,
    unlockLevel: 5,
    recommendedPersonaSlug: 'client',
  },
];

const badgeSeeds: BadgeSeed[] = [
  {
    code: 'FIRST_CONVERSATION',
    name: 'First Conversation',
    description: 'Complete your first guided practice scenario to unlock this badge.',
    unlockRules: {
      type: 'scenario_completed',
      threshold: 1,
      description: 'Awarded after successfully completing any seeded scenario.',
    },
  },
  {
    code: 'CONSISTENCY_CHAMPION',
    name: 'Consistency Champion',
    description: 'Show up regularly for practice and build lasting communication habits.',
    unlockRules: {
      type: 'streak_days',
      threshold: 5,
      measurementWindowDays: 7,
      description: 'Complete at least one conversation on five distinct days within a rolling week.',
    },
  },
  {
    code: 'INSIGHTFUL_COLLABORATOR',
    name: 'Insightful Collaborator',
    description: 'Demonstrate depth by exploring multiple personas and scenario categories.',
    unlockRules: {
      type: 'persona_variety',
      threshold: 3,
      description: 'Earned after completing conversations with three different personas.',
    },
  },
];

async function seedPersonas() {
  const personaMap = new Map<string, Persona>();

  for (const persona of personaSeeds) {
    const record = await prisma.persona.upsert({
      where: { slug: persona.slug },
      update: {
        name: persona.name,
        toneGuidance: persona.toneGuidance,
        samplePrompts: persona.samplePrompts,
        difficultyLevels: persona.difficultyLevels as Prisma.InputJsonValue,
        avatarUrl: persona.avatarUrl,
        tags: persona.tags,
      },
      create: {
        slug: persona.slug,
        name: persona.name,
        toneGuidance: persona.toneGuidance,
        samplePrompts: persona.samplePrompts,
        difficultyLevels: persona.difficultyLevels as Prisma.InputJsonValue,
        avatarUrl: persona.avatarUrl,
        tags: persona.tags,
      },
    });

    personaMap.set(record.slug, record);
  }

  return personaMap;
}

async function seedScenarios(personaMap: Map<string, Persona>) {
  for (const scenario of scenarioSeeds) {
    const recommendedPersonaId = scenario.recommendedPersonaSlug
      ? personaMap.get(scenario.recommendedPersonaSlug)?.id ?? null
      : null;

    const data = {
      title: scenario.title,
      description: scenario.description,
      objective: scenario.objective,
      category: scenario.category,
      basePrompts: scenario.basePrompts,
      defaultDifficulty: scenario.defaultDifficulty,
      unlockLevel: scenario.unlockLevel,
      isSeeded: true,
      recommendedPersonaId,
    };

    await prisma.scenario.upsert({
      where: { slug: scenario.slug },
      update: data,
      create: {
        slug: scenario.slug,
        ...data,
      },
    });
  }
}

async function seedBadges() {
  for (const badge of badgeSeeds) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        description: badge.description,
        unlockRules: badge.unlockRules,
        isSeeded: true,
      },
      create: {
        code: badge.code,
        name: badge.name,
        description: badge.description,
        unlockRules: badge.unlockRules,
        isSeeded: true,
      },
    });
  }
}

async function seedAnalyticsBaselines() {
  const users = await prisma.user.findMany({ select: { id: true } });

  if (users.length === 0) {
    console.info('No users found; analytics baselines will be created when users onboard.');
    return;
  }

  for (const user of users) {
    await prisma.userAnalytics.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
      },
    });
  }

  console.info(`Ensured analytics baselines for ${users.length} users.`);
}

async function runSmokeTest() {
  const [personaCount, scenarioCount, badgeCount] = await Promise.all([
    prisma.persona.count(),
    prisma.scenario.count({ where: { isSeeded: true } }),
    prisma.badge.count({ where: { isSeeded: true } }),
  ]);

  const sampleScenario = await prisma.scenario.findFirst({
    where: { isSeeded: true },
    include: { recommendedPersona: true },
    orderBy: { createdAt: 'asc' },
  });

  console.info('Seed smoke test summary', {
    personaCount,
    scenarioCount,
    badgeCount,
    sampleScenario: sampleScenario
      ? {
          slug: sampleScenario.slug,
          recommendedPersona: sampleScenario.recommendedPersona?.slug ?? null,
          difficulty: sampleScenario.defaultDifficulty,
        }
      : null,
  });
}

async function main() {
  console.info('Seeding baseline personas...');
  const personas = await seedPersonas();

  console.info('Seeding baseline scenarios...');
  await seedScenarios(personas);

  console.info('Seeding baseline badges...');
  await seedBadges();

  console.info('Ensuring analytics baselines...');
  await seedAnalyticsBaselines();

  await runSmokeTest();
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
