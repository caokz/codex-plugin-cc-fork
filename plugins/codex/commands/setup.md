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

Review Gate Configuration:
- If the user wants to enable or configure the review gate and did not use --enable-review-gate / --disable-review-gate flags, use `AskUserQuestion` to configure it interactively.
- Ask up to 3 questions in a single `AskUserQuestion` call:

Question 1: "Choose a review template"
  - `default` — General design and correctness review
  - `code-quality` — Code readability, naming, DRY, error handling
  - `security` — Injection, XSS, secrets, auth bypass
  - `performance` — Algorithmic complexity, memory, N+1 queries
  - `trading-system` — A-share trading domain + engineering quality

Question 2: "Maximum review rounds (how many times Codex can block before allowing)"
  - `3 rounds (Recommended)`
  - `5 rounds`
  - `10 rounds`

Question 3: "Design document path (optional, leave empty to skip)"
  - This is optional. Only relevant when using trading-system or other templates that support design doc comparison.
  - Accept relative or absolute path.

After gathering answers, run the full configuration command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json --enable-review-gate --review-gate-prompt <template> --review-gate-max-rounds <n> [--review-gate-design-doc <path>]
```

Present the configuration result to the user, including the current review gate settings.
