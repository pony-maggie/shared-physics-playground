# Local Setup

## Prerequisites

- Node.js 20+ recommended
- `npm` available in your shell

## Install Dependencies

From the repository root:

```bash
npm install
cd apps/web && npm install && cd ../..
cd apps/server && npm install && cd ../..
```

## Run The App

Copy the example env file first:

```bash
cd /Users/malu/Documents/project/shared-physics-playground
cp .env.example .env
```

Then edit `.env` and fill in any real values you need, especially `GOOGLE_API_KEY` if you want live Gemini planning.
The server now also reads logging and planner-cost env vars from `.env`, so you can tune observability without changing code.

Use the one-command startup script from the repository root:

```bash
cd /Users/malu/Documents/project/shared-physics-playground
./scripts/dev-up.sh
```

What it does:

- stops any previous local server/web processes on ports `2567` and `4173`
- starts a fresh server and web process
- waits until both are healthy
- opens `http://127.0.0.1:4173` in your browser

The script is safe to run repeatedly. Running it again restarts the local environment.

To stop the local environment:

```bash
cd /Users/malu/Documents/project/shared-physics-playground
./scripts/dev-down.sh
```

The server listens on `http://127.0.0.1:2567`.
Health check:

```bash
curl http://127.0.0.1:2567/healthz
```

If you want to start the environment without auto-opening the browser:

```bash
SKIP_OPEN=1 ./scripts/dev-up.sh
```

Logs are written to:

- `.dev-runtime/server.log`
- `.dev-runtime/web.log`
- `.dev-runtime/server-events.log` for structured JSONL server events

## Email Login

Local development uses the same email-code sign-in shape as production:

- enter a real email address
- solve the human check
- click `Send Code`
- read the verification code from the mailbox
- enter the code and click `Verify And Enter`

The fixed local Pro-dev account and `424242` bypass have been removed. When the root `.env`
contains complete `SMTP_*` settings, the server sends the code through SMTP and does not echo it
back to the browser. If SMTP is intentionally left unconfigured in non-production, the app can still
show a development code for automated local smoke tests; production fails closed without email
delivery.

## Database

No separate database service is required.

- The server uses SQLite through `better-sqlite3`
- The database file is [worlds.sqlite](/Users/malu/Documents/project/shared-physics-playground/data/worlds.sqlite)
- The file is created and used locally by the server

## Realtime And API Routing

The web app proxies both HTTP and websocket traffic to the local server:

- `/api` -> `http://127.0.0.1:2567`
- `/colyseus` -> `http://127.0.0.1:2567`

This is configured in [vite.config.ts](/Users/malu/Documents/project/shared-physics-playground/apps/web/vite.config.ts).

## Run Tests

From the repository root:

```bash
./harness/init.sh
./harness/verify.sh
./harness/smoke.sh
npm test
./node_modules/.bin/playwright test tests/e2e/mvp-smoke.spec.ts
```

## Run E2E Only

Playwright can start the local server and web app for you:

```bash
cd /Users/malu/Documents/project/shared-physics-playground
./node_modules/.bin/playwright test tests/e2e/mvp-smoke.spec.ts
```

The auto-start behavior is configured in [playwright.config.ts](/Users/malu/Documents/project/shared-physics-playground/playwright.config.ts).

## Enable Live AI Providers

The default planner mode is `mock` unless your `.env` switches it to `live`.

Recommended local setup:

```bash
cd /Users/malu/Documents/project/shared-physics-playground
cp .env.example .env
```

Then set:

```env
PLAYGROUND_AI_MODE=live
PLAYGROUND_AI_VENDOR=google
PLAYGROUND_AI_MODEL=gemini-2.5-flash
PLAYGROUND_AI_LIVE_PROVIDER_ORDER=google,minimax
GOOGLE_API_KEY=your_key_here
PLAYGROUND_AI_MINIMAX_MODEL=MiniMax-M2.7
MINIMAX_API_KEY=your_key_here
```

`./scripts/dev-up.sh` now automatically loads `.env` and `.env.local`, so you do not need to export variables manually every time.

Best practice:

- keep real secrets in `.env` or `.env.local`
- commit `.env.example` only
- do not commit `.env`
- for servers, prefer platform-managed environment variables or a non-committed `.env.production`
- use `PLAYGROUND_LOG_PATH` to move the structured server log if you want it outside `.dev-runtime/`
- set `PLAYGROUND_LOG_TO_STDOUT=false` if you want file-only JSONL logs
- tune planner cost with `PLAYGROUND_AI_BYPASS_ENABLED`, `PLAYGROUND_AI_CACHE_TTL_MS`, `PLAYGROUND_AI_CACHE_MAX_ENTRIES`, and `PLAYGROUND_AI_PROMPT_VERSION`

## AI Provider Pool

- Gemini and MiniMax are both available as live providers
- the default provider order is `google,minimax`
- change `PLAYGROUND_AI_LIVE_PROVIDER_ORDER` if you want MiniMax tried first
- common high-confidence prompts may still bypass live providers completely
- if both live providers fail, the server falls back to the constrained local planner
- legacy fallback envs are still accepted for compatibility, but the preferred config is the explicit provider-order env

## Planner And Server Logs

- default structured log file: `.dev-runtime/server-events.log`
- planner bypasses appear as `planner.bypass_hit`
- planner cache reuse appears as `planner.cache_hit`
- provider attempts appear as `planner.provider_attempt`
- provider failures appear as `planner.provider_failed`
- live provider successes appear as `planner.live_success`
- all-provider failure reasons appear as `planner.live_failed`

## Access Policy Config

The lightweight room and quota policy now lives in:

- [config/playground-access.json](/Users/malu/Documents/project/shared-physics-playground/config/playground-access.json)

This is the current replacement for an admin backend. You can change:

- whether authenticated users default to `free` or `pro`
- whether a tier can create named rooms
- how many objects each tier can own
- per-email overrides for real test or operator accounts

There is no built-in Pro email override by default. Add a real mailbox to `userOverrides` only when
you want that account to test Pro-only flows such as named-room creation.
