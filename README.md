# CTOTextPro

An AI-assisted evaluation and feedback platform that combines conversational guidance (Chat), automated rubric scoring (Evaluate), and secure document uploads for engineering teams. The project is built on Next.js (App Router) with a hybrid Edge/Node runtime footprint.

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment Setup](#environment-setup)
   - [Environment Variables](#environment-variables)
   - [Firebase Project Setup](#firebase-project-setup)
   - [Supabase Provisioning](#supabase-provisioning)
   - [Upstash Configuration](#upstash-configuration)
   - [Groq API Access](#groq-api-access)
   - [Local Postgres via Docker](#local-postgres-via-docker)
   - [Firebase Emulator (optional)](#firebase-emulator-optional)
   - [Database Migrations & Seeding](#database-migrations--seeding)
   - [Run the Development Server](#run-the-development-server)
5. [Testing](#testing)
6. [Deployment Guide](#deployment-guide)
   - [Vercel Runtime Configuration](#vercel-runtime-configuration)
   - [Environment Variable Management](#environment-variable-management)
   - [Connecting Supabase & Other Integrations](#connecting-supabase--other-integrations)
   - [Build & Release Process](#build--release-process)
   - [Deployment Checklist](#deployment-checklist)
7. [Contribution Guidelines](#contribution-guidelines)
8. [Troubleshooting](#troubleshooting)
9. [Useful Commands](#useful-commands)

---

## Feature Overview

- **Conversational Chat (Edge runtime):** Real-time assistant powered by Groq LLMs with Firebase-authenticated user context.
- **Automated Evaluations (Edge runtime):** Deterministic scoring pipelines that run close to the user for low latency, persisting structured results to Supabase Postgres.
- **Secure Uploads (Node runtime):** Multipart uploads for large files, with metadata stored in Postgres and binary objects pushed to Firebase Storage.
- **Realtime Progress & Notifications:** Upstash Redis powers streaming updates, rate limiting, and job fan-out.
- **Role-based Access Control:** Firebase Authentication + Supabase policies enforce granular permissions for evaluators vs. contributors.

## Architecture

```mermaid
graph TD
  Client[Next.js Frontend (App Router)] -->|Edge Runtime| ChatRoute[app/api/chat]
  Client -->|Edge Runtime| EvaluateRoute[app/api/evaluate]
  Client -->|Node Runtime| UploadRoute[app/api/uploads]
  ChatRoute -->|LLM Calls| Groq[Groq LLM API]
  EvaluateRoute -->|Persist Scores| SupabaseDB[(Supabase Postgres)]
  UploadRoute -->|Store Binary| FirebaseStorage[(Firebase Storage)]
  UploadRoute -->|Index Metadata| SupabaseDB
  AllRoutes -->|Auth & User Context| FirebaseAuth[Firebase Auth]
  AllRoutes -->|Caching & Rate Limits| Upstash[Upstash Redis]
  SupabaseDB -->|Analytics & BI| SupabaseStudio[Supabase Studio]
```

- **Framework:** Next.js 14 (App Router) with TypeScript and `pnpm`.
- **Database:** Supabase-hosted Postgres accessed through Prisma (migrations & seeding commands shown below).
- **Authentication & Storage:** Firebase Authentication + Firebase Storage (optionally replaced with Supabase Storage later).
- **Edge/Node split:** Conversations and evaluations are latency-sensitive and run on the Vercel Edge runtime. File uploads and any multipart parsing rely on the Node runtime.
- **Background Tasks:** Upstash Redis is used for rate limiting, job queues, and websocket fan-out (via Upstash QStash or Redis Streams).

## Prerequisites

- **Node.js** ≥ 18.18 (matches Vercel Node 18 baseline) – consider using `nvm`.
- **pnpm** ≥ 8.7 (`npm install -g pnpm`).
- **Docker Desktop** or Docker Engine (for running Postgres locally).
- **Firebase CLI** (`npm install -g firebase-tools`) for emulator support.
- **Supabase CLI** (`npm install -g supabase`), optional for local migrations.

## Environment Setup

### Environment Variables

1. Duplicate the example file and customise values:
   ```bash
   cp .env.example .env.local
   ```
2. Update the placeholders with real credentials. Sensitive JSON values (like `FIREBASE_SERVICE_ACCOUNT`) should be kept as a single line JSON string. If your secrets contain newlines, escape them (`\n`).
3. Never commit `.env.local` or other dotenv files – they are ignored via `.gitignore`.

### Firebase Project Setup

1. Create a Firebase project via [console.firebase.google.com](https://console.firebase.google.com/).
2. Enable **Email/Password** (and any other required providers) in **Authentication → Sign-in method**.
3. Create a Web App in the Firebase console and copy the configuration values into the `NEXT_PUBLIC_FIREBASE_*` variables.
4. Generate a service account with **Firebase Admin SDK** privileges:
   - Navigate to **Project settings → Service accounts**.
   - Create a new private key and download the JSON. Paste the content into `FIREBASE_SERVICE_ACCOUNT` (stringified JSON).
5. Create a default Cloud Storage bucket or reuse the provided one. Match bucket name in `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

### Supabase Provisioning

1. Sign in at [Supabase](https://supabase.com/) and create a new project (choose a strong database password).
2. In the project settings:
   - Copy the **API URL** and **anon key** into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy the **service_role key** into `SUPABASE_SERVICE_ROLE_KEY` (used for migrations & server-side jobs).
   - Set a **JWT secret** for row-level security if not auto-generated and add it to `SUPABASE_JWT_SECRET`.
3. Under **Database → Connection pooling**, grab the connection string and map it to `DATABASE_URL`. Adjust the port/user/password as needed.
4. Run the migrations (see [Database Migrations & Seeding](#database-migrations--seeding)).
5. Prisma reads the connection string from `DATABASE_URL`, so ensure `.env.local` (or your deployment secrets) matches the Supabase project you intend to target.

### Upstash Configuration

1. Create a Redis database in [Upstash](https://upstash.com/redis).
2. Copy the **Redis URL** into `UPSTASH_REDIS_URL` (use the TLS `rediss://` URL).
3. For REST usage (rate limiting/QStash triggers), grab the REST endpoint and token:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. In Vercel, add these values to the project environment and mark them as encrypted secrets.

### Groq API Access

1. Request an API key at [console.groq.com/keys](https://console.groq.com/keys).
2. Paste the key into `GROQ_API_KEY`.
3. Confirm the model IDs used in the code (`mixtral-8x7b-32768`, `llama3-70b-8192`, etc.) are enabled for your account.

### Local Postgres via Docker

Populate a local Supabase-compatible Postgres instance using Docker:

```bash
docker compose -f docker-compose.postgres.yml up -d
```

If you do not have a compose file yet, you can start a container directly:

```bash
docker run --name ctotextpro-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 54322:5432 \
  supabase/postgres
```

Update `DATABASE_URL` to `postgresql://postgres:postgres@localhost:54322/postgres` (matching `.env.example`).

### Firebase Emulator (optional)

Use the emulator suite for integration and unit testing without touching production:

```bash
firebase login
firebase init emulators
firebase emulators:start --import=.firebase-emulator-data
```

Point your tests or local config to the emulator by setting `FIREBASE_EMULATOR_HOST=localhost:9099` and other emulator-related environment variables when running against the suite.

### Database Migrations & Seeding

After installing dependencies and configuring `.env.local`, run:

```bash
pnpm prisma migrate dev      # Apply local migrations & generate types
pnpm prisma db seed          # Seed baseline data (rubrics, demo users, etc.)
```

In CI or production deployments use:

```bash
pnpm prisma migrate deploy
pnpm db:seed                 # Idempotent seed script for production/sandbox
```

### Run the Development Server

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Edge functions (chat/evaluate) call Groq APIs; ensure the key is present or the routes will return an error.

## Testing

| Command | Purpose |
|---------|---------|
| `pnpm lint` | ESLint + custom type-aware rules |
| `pnpm test` | Unit tests (Vitest/Jest depending on configuration) |
| `pnpm test:integration` | Integration or contract tests hitting the Firebase emulator and local Postgres |
| `pnpm typecheck` | Ensures TypeScript types compile |
| `pnpm e2e` | Playwright/Cypress end-to-end tests (requires running dev server + seed data) |

> Tip: When running integration/e2e tests locally, export `FIREBASE_AUTH_EMULATOR_HOST` and use the Docker Postgres instance to avoid polluting cloud resources.

## Deployment Guide

### Vercel Runtime Configuration

The repository ships with a `vercel.json` that pins runtime environments:

- `app/api/chat/route.ts` → **Edge runtime** (low-latency streaming responses)
- `app/api/evaluate/route.ts` → **Edge runtime** (deterministic evaluation jobs)
- `middleware.ts` → **Edge runtime** (auth enforcement, locale detection)
- `app/api/uploads/route.ts` → **Node.js 20 runtime** (multipart form parsing & streaming uploads)

Ensure the file structure in the `app/api` directory matches these paths. Vercel will automatically apply the runtime assignments during deployment.

### Environment Variable Management

1. In Vercel, open the project → **Settings → Environment Variables**.
2. Import `.env.local` values using the “Import from .env file” feature or add them manually.
3. Mirror variables across **Development**, **Preview**, and **Production** environments. Secrets such as `SUPABASE_SERVICE_ROLE_KEY` should only exist in Development/Preview if needed.
4. Set `NEXT_PUBLIC_SITE_URL` to the canonical production domain and `NEXTAUTH_URL` to the deployed URL.

### Connecting Supabase & Other Integrations

- **Supabase:** Enable the Vercel → Supabase integration or manually add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as environment variables.
- **Upstash:** Link the Upstash Redis database to Vercel using the Upstash integration or copy the REST URL/token manually.
- **Firebase:** No native integration is required. Ensure service account JSON is stored as a single-line string secret.
- **Analytics / Observability:** Configure PostHog, Logflare, or your chosen provider via additional env vars.

### Build & Release Process

- Vercel Build Command: `pnpm build`
- Install Command: `pnpm install`
- Output directory: handled automatically by Next.js

For CI (GitHub Actions/GitLab), run the same commands to keep parity with local and Vercel builds.

### Deployment Checklist

- [ ] ✅ CI pipeline green (lint, typecheck, tests)
- [ ] ✅ Database migrations applied (`pnpm prisma migrate deploy`)
- [ ] ✅ Seed data executed/verified (`pnpm db:seed`)
- [ ] ✅ Environment variables updated for the target environment (Vercel dashboard)
- [ ] ✅ Supabase connection string & pool password validated
- [ ] ✅ Upstash Redis credentials present and tested
- [ ] ✅ Firebase service account rotated if necessary & matches deployment
- [ ] ✅ Static assets & uploads working in staging (verify Node upload route)

## Contribution Guidelines

1. **Branching:** Create feature branches from `main` using the pattern `feature/<short-description>`.
2. **Commits:** Write descriptive messages referencing tickets/issues where applicable. Keep commits focused.
3. **Code Style:** Follow existing ESLint and Prettier rules. Avoid introducing new style conventions without discussion.
4. **Testing:** Add or update tests for any new functionality. Ensure `pnpm lint`, `pnpm test`, and `pnpm typecheck` pass locally before opening a PR.
5. **Pull Requests:** Provide context, screenshots (if UI), and describe testing performed. Request review from at least one core maintainer.
6. **Documentation:** Update README or `docs/` entries whenever architecture or operations change.

## Troubleshooting

- **Edge runtime errors:** Confirm dependencies used in Edge handlers are compatible (no Node-only APIs).
- **Uploads failing:** Verify the route is deployed on the Node runtime and that request body size limits are configured via `config.api.bodyParser.sizeLimit`.
- **Database connection refused:** Confirm Docker container is running and port `54322` is not blocked. Reset using `docker restart ctotextpro-postgres`.
- **Firebase auth issues:** Ensure emulator vs. production credentials are not mixed. When using the emulator, set `FIREBASE_AUTH_EMULATOR_HOST`.

## Useful Commands

```bash
pnpm install                 # Install dependencies
pnpm dev                     # Start Next.js dev server
pnpm prisma migrate dev      # Create & apply migrations locally
pnpm prisma db seed          # Seed development data
pnpm lint                    # Lint the codebase
pnpm test                    # Run unit tests
pnpm typecheck               # Validate TypeScript types
pnpm build                   # Generate production build (same as Vercel)
```

Happy building! 🎉
