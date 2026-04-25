# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@openai/codex-plugin-cc` is a Claude Code plugin that integrates OpenAI Codex for code reviews and task delegation. Users invoke slash commands (`/codex:review`, `/codex:adversarial-review`, `/codex:rescue`, etc.) which dispatch to Codex via JSON-RPC over its app-server protocol. ES modules throughout (`.mjs`), requires Node 18.18+.

## Commands

```bash
npm test                           # Run all tests
node --test tests/<name>.test.mjs  # Run a single test file
npm run build                      # Type-check via tsc (noEmit, no bundling)
npm run prebuild                   # Generate TS types from codex app-server (needs codex CLI)
npm run bump-version               # Bump plugin version
npm run check-version              # Verify version consistency
```

## Architecture

**Entry point**: `plugins/codex/scripts/codex-companion.mjs` — CLI dispatcher invoked by all slash commands.

**Command flow**: `plugins/codex/commands/*.md` (slash command definitions) → `codex-companion.mjs` → handlers in `plugins/codex/scripts/lib/`.

**Core modules** (all under `plugins/codex/scripts/lib/`):
- `codex.mjs` — `runAppServerReview()` and `runAppServerTurn()` handle Codex interactions; `captureTurn()` manages the full turn lifecycle and notification stream
- `app-server.mjs` — `CodexAppServerClient` implements JSON-RPC over stdin/stdout to `codex app-server`
- `broker-lifecycle.mjs` — manages a shared broker process (`app-server-broker.mjs`) so multiple Claude sessions reuse one Codex connection
- `state.mjs` / `job-control.mjs` / `tracked-jobs.mjs` — persistent job tracking with status, logs, and results; max 50 jobs per workspace with automatic pruning

**Other key directories**:
- `plugins/codex/hooks/` — session lifecycle hook and stop-review-gate hook
- `plugins/codex/prompts/` — prompt templates for review and adversarial-review modes
- `plugins/codex/skills/` — skill definitions (codex-cli-runtime, codex-result-handling, gpt-5-4-prompting)
- `plugins/codex/schemas/` — JSON Schema for review output validation

## Conventions

- All runtime code is plain `.mjs` — no build/bundle step for execution
- TypeScript (`tsconfig.app-server.json`) is **type-checking only** (`noEmit: true`), covering `lib/app-server.mjs`, `lib/codex.mjs`, `lib/fs.mjs`, `lib/process.mjs`, and generated types
- Generated types land in `plugins/codex/.generated/` (gitignored)
- Tests use Node.js built-in `node:test` with helpers in `tests/helpers.mjs`
- Markdown files define slash commands, agents, skills, and prompts — not documentation
- Plugin manifest at `plugins/codex/.claude-plugin/plugin.json`
