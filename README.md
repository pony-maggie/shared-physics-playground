# Shared Physics Playground

> AI-assisted physics lab for interactive, deterministic classroom experiments.

**Languages:** English | [中文](README.zh-CN.md)

**Site:** https://pyhsics.lucasma.cc/

## Screenshot

![Website screenshot placeholder](assets/site-screenshot-placeholder.svg)

> Replace this placeholder with a real screenshot of the deployed website before publishing widely.

## What It Is

Shared Physics Playground is a focused web lab for asking physics questions and running small interactive experiments. It combines a deterministic built-in experiment catalog with an optional Gemini-backed planner that maps authenticated natural-language prompts to safe, schema-validated simulations.

The product model:

- **Built-in simulations first:** experiments are code-owned and deterministic, not arbitrary model-generated code.
- **AI as a router:** when configured, Gemini interprets the user's prompt and selects/configures one of the supported experiment templates.
- **Interactive learning loop:** sliders, measurements, playback controls, and nearby suggestions help users explore the physics directly.
- **Simple entitlement model:** guests get a fixed demo, Free users get limited AI generation, and Pro interest can be recorded without live payments.

## Current Built-In Experiments

| Experiment | What It Demonstrates |
|---|---|
| Inclined plane | Acceleration, gravity component, friction |
| Projectile motion | Launch angle, range, flight time |
| Spring oscillator | Hooke's law, period, damping |
| Pendulum | Period and gravity |
| Circular motion | Centripetal acceleration |
| Elastic collision | Momentum and energy transfer |
| Buoyancy | Density and floating force |
| Lever balance | Torque and mechanical advantage |
| Ohm's law | Voltage, current, resistance |
| Ideal gas | Pressure, volume, temperature |
| Work and energy | Force, distance, kinetic energy |
| Wave speed | Frequency, wavelength, speed |
| Refraction | Snell's law |
| Lens imaging | Focal length and image distance |
| Coulomb's law | Electric force and charge distance |
| RC circuit | Charging curve and time constant |

## Install

```bash
npm install
cd apps/server && npm install
cd ../web && npm install
cd ../..
cp .env.example .env
cp config/playground-access.example.json config/playground-access.json
```

Requires Node.js 22+ and SQLite support through `better-sqlite3`.

Edit `.env` only for local secrets such as Gemini or SMTP settings. Do not commit `.env`.

## Two-Minute Smoke Test

```bash
./scripts/dev-up.sh
```

Open:

- Web app: `http://127.0.0.1:5173`
- Server health: `http://127.0.0.1:2567/healthz`

Stop local services:

```bash
./scripts/dev-down.sh
```

Run repository checks:

```bash
npm test
cd apps/web && npm run build
cd ../..
npm run check:web-build
./harness/verify.sh
./harness/smoke.sh
```

## Configuration

Common environment variables:

| Variable | Purpose |
|---|---|
| `PORT` | Backend port. Defaults to `2567`. |
| `GOOGLE_API_KEY` | Enables Gemini-backed education planning. |
| `PLAYGROUND_EDUCATION_AI_MODEL` | Optional Gemini model override for education planning. |
| `PLAYGROUND_PRO_INTEREST_EMAIL` | Operator inbox for Pro upgrade-interest emails. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` | Enable real email-code login and Pro-interest delivery. |
| `PLAYGROUND_LOG_LEVEL`, `PLAYGROUND_LOG_PATH`, `PLAYGROUND_LOG_TO_STDOUT` | Structured logging controls. |

Access-tier overrides live in `config/playground-access.json`, copied from `config/playground-access.example.json`.

## Repository Layout

```text
apps/web                  React/Vite frontend
apps/server               Express backend, auth, SMTP, quotas, education planning
packages/prompt-contracts Shared simulation schemas and planner contracts
packages/shared           Shared access-policy helpers
packages/physics-schema   Physics object catalog contracts
tests                     Repository-level smoke and browser tests
scripts                   Local dev and build-analysis helpers
harness                   Lightweight workflow verification
assets                    Public README assets
```

Local planning and deployment notes under `docs/`, `state/`, and `specs/` are intentionally ignored for open-source publishing.

## Open-Source Hygiene

Before pushing to GitHub, scan for accidental secrets:

```bash
rg -n "API_KEY|SECRET|PASSWORD|TOKEN|SMTP|GOOGLE|MINIMAX|sk-|AIza|Bearer" . \
  --glob '!node_modules/**' \
  --glob '!apps/*/node_modules/**' \
  --glob '!apps/web/dist/**' \
  --glob '!docs/**' \
  --glob '!state/**'
```

Expected private files are ignored by `.gitignore`, including `.env*`, `docs/`, `state/`, `data/`, `debug/`, `.dev-runtime/`, SQLite databases, and `config/playground-access.json`.

## License

MIT.
