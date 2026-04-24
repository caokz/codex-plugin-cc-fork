---
description: Check whether the local Codex CLI is ready and optionally configure the stop-time review gate
argument-hint: '[--enable-review-gate|--disable-review-gate]'
allowed-tools: Bash(node:*), Bash(npm:*), AskUserQuestion
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json "$ARGUMENTS"
```

If the result says Codex is unavailable and npm is available:
- Use `AskUserQuestion` exactly once to ask whether Claude should install Codex now.
- Put the install option first and suffix it with `(Recommended)`.
- Use these two options:
  - `Install Codex (Recommended)`
  - `Skip for now`
- If the user chooses install, run:

```bash
npm install -g @openai/codex
```

- Then rerun:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json "$ARGUMENTS"
```

If Codex is already installed or npm is unavailable:
- Do not ask about installation.

Output rules:
- Present the final setup output to the user.
- If installation was skipped, present the original setup output.
- If Codex is installed but not authenticated, preserve the guidance to run `!codex login`.

Review Gate Configuration — ALWAYS do this after presenting setup status:
- After presenting the setup output, ALWAYS use `AskUserQuestion` exactly once to ask whether the user wants to configure the review gate.
- The question must be: "Would you like to configure the review gate?"
- The options must be:
  - `Configure review gate` — if the review gate is not yet enabled, suffix with `(Recommended)`
  - `Skip for now`
- Do NOT skip this question. Always ask it, even if the review gate is already enabled.
- If the user chooses "Skip for now", stop here.
- If the user chooses "Configure review gate", use `AskUserQuestion` to ask all 3 configuration questions in a single call:

Question 1 — "Choose a review template":
  - `default` — General design and correctness review
  - `code-quality` — Code readability, naming, DRY, error handling
  - `security` — Injection, XSS, secrets, auth bypass
  - `performance` — Algorithmic complexity, memory, N+1 queries
  - `trading-system` — A-share trading domain + engineering quality

Question 2 — "Maximum review rounds":
  - `3 rounds (Recommended)`
  - `5 rounds`
  - `10 rounds`

Question 3 — "Design document path (leave empty to skip)":
  - This is optional. Only relevant when using trading-system or other templates that support design doc comparison.
  - Accept relative or absolute path.

After gathering answers, run the full configuration command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json --enable-review-gate --review-gate-prompt <template> --review-gate-max-rounds <n> [--review-gate-design-doc <path>]
```

Present the final configuration result to the user, including the current review gate settings from `reviewGateConfig` in the JSON output.
