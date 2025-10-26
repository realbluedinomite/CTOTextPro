-- CreateEnum
CREATE TYPE "TonePreference" AS ENUM ('CASUAL', 'NEUTRAL', 'FORMAL', 'CONFIDENT');

-- CreateEnum
CREATE TYPE "FeedbackDetail" AS ENUM ('SUMMARY', 'DETAILED', 'ACTIONABLE');

-- CreateEnum
CREATE TYPE "ScenarioCategory" AS ENUM ('COMMUNICATION', 'LEADERSHIP', 'STRATEGY', 'NEGOTIATION', 'PERFORMANCE', 'CUSTOMER_SUCCESS');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('COACHING', 'SIMULATION');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'COACH', 'PERSONA');

-- CreateEnum
CREATE TYPE "ScoreMetric" AS ENUM ('TONE', 'CLARITY', 'PROFESSIONALISM', 'GRAMMAR');

-- CreateEnum
CREATE TYPE "BadgeCode" AS ENUM ('FIRST_SESSION', 'STREAK_BRONZE', 'STREAK_SILVER', 'STREAK_GOLD', 'TEN_SESSIONS', 'PERFECT_TONE');

-- CreateEnum
CREATE TYPE "PreferenceKey" AS ENUM ('UI_THEME', 'LANGUAGE_OVERRIDE', 'NOTIFICATION_DIGEST', 'EXPERIMENTAL_FEATURES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "photoURL" TEXT,
    "providerId" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "tonePreference" "TonePreference" NOT NULL DEFAULT 'NEUTRAL',
    "feedbackDetail" "FeedbackDetail" NOT NULL DEFAULT 'SUMMARY',
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "notifySessionRecaps" BOOLEAN NOT NULL DEFAULT true,
    "notifyStreaks" BOOLEAN NOT NULL DEFAULT true,
    "notifyProductUpdates" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "toneGuidance" TEXT,
    "difficultyMin" "Difficulty",
    "difficultyMax" "Difficulty",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ScenarioCategory" NOT NULL,
    "personaId" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "prompt" TEXT NOT NULL,
    "isSeeded" BOOLEAN NOT NULL DEFAULT false,
    "unlockLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomScenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "personaOverride" JSONB,
    "difficulty" "Difficulty",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "customScenarioId" TEXT,
    "mode" "Mode" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "personaSnapshot" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "userConfidence" INTEGER,
    "responseTimeMsAvg" INTEGER,
    "promptTokenCount" INTEGER,
    "completionTokenCount" INTEGER,
    "totalTokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latencyMs" INTEGER,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "grammarNotes" JSONB,
    "phrasingAlternatives" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "metric" "ScoreMetric" NOT NULL,
    "value" DECIMAL(5,2) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "delta" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsAggregate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "avgTone" DECIMAL(5,2),
    "avgClarity" DECIMAL(5,2),
    "avgProfessionalism" DECIMAL(5,2),
    "avgGrammar" DECIMAL(5,2),
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "badgesEarned" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "lastSessionAt" TIMESTAMP(3),
    "toneConsistencyScore" DECIMAL(5,2),
    "grammarErrorRate" DECIMAL(5,2),
    "responseTimeAvg" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" "BadgeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "length" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" "PreferenceKey" NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadReference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "originalTextHash" TEXT NOT NULL,
    "rewrite" JSONB,
    "annotations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_slug_key" ON "Scenario"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CustomScenario_userId_title_key" ON "CustomScenario"("userId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Session_userId_startedAt_key" ON "Session"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_sessionId_key" ON "Feedback"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsAggregate_userId_key" ON "AnalyticsAggregate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_userId_code_key" ON "Badge"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_userId_key_key" ON "Preference"("userId", "key");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomScenario" ADD CONSTRAINT "CustomScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_customScenarioId_fkey" FOREIGN KEY ("customScenarioId") REFERENCES "CustomScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsAggregate" ADD CONSTRAINT "AnalyticsAggregate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadReference" ADD CONSTRAINT "UploadReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

