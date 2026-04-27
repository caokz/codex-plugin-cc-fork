#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { getCodexAvailability } from "./lib/codex.mjs";
import { interpolateTemplate, resolvePromptTemplate } from "./lib/prompts.mjs";
import { getConfig, listJobs, setConfig, resolveStateDir } from "./lib/state.mjs";
import { sortJobsNewestFirst } from "./lib/job-control.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";

const STOP_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const STOP_REVIEW_TASK_MARKER = "Run a stop-gate review of the previous Claude turn.";

function readHookInput() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function emitDecision(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function logNote(message) {
  if (!message) {
    return;
  }
  process.stderr.write(`${message}\n`);
}

function filterJobsForCurrentSession(jobs, input = {}) {
  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;
  if (!sessionId) {
    return jobs;
  }
  return jobs.filter((job) => job.sessionId === sessionId);
}

function runGit(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 10000 });
  if (r.status === 0) {
    return String(r.stdout || "").trim();
  }
  return null;
}

function buildStopReviewPrompt(input = {}, config = {}, workspaceRoot = "") {
  const lastAssistantMessage = String(input.last_assistant_message ?? "").trim();
  const template = resolvePromptTemplate(ROOT_DIR, config.stopReviewGatePrompt || "default", workspaceRoot);
  const claudeResponseBlock = lastAssistantMessage
    ? ["Previous Claude response:", lastAssistantMessage].join("\n")
    : "";

  // Capture actual code changes: committed (last commit), staged, and unstaged
  const committedDiff = runGit(workspaceRoot, ["diff", "HEAD~1", "HEAD"]);
  const changedFiles = runGit(workspaceRoot, ["diff", "--name-only", "HEAD"]);
  const stagedDiff = runGit(workspaceRoot, ["diff", "--cached"]);
  const unstagedDiff = runGit(workspaceRoot, ["diff"]);
  const changesBlock = buildChangesBlock(committedDiff, changedFiles, stagedDiff, unstagedDiff);

  let designDocBlock = "";
  const designDocPath = String(config.stopReviewGateDesignDoc ?? "").trim();
  if (designDocPath) {
    const resolvedPath = path.isAbsolute(designDocPath) ? designDocPath : path.resolve(workspaceRoot, designDocPath);
    if (fs.existsSync(resolvedPath)) {
      designDocBlock = "Design document to review against: " + designDocPath + "\nRead this file and compare the changed code against it. Only read the sections relevant to the files that were changed.";
    } else {
      designDocBlock = "Design document (" + designDocPath + "): [file not found — skipped]";
    }
  }

  return interpolateTemplate(template, {
    CLAUDE_RESPONSE_BLOCK: claudeResponseBlock,
    DESIGN_DOC_BLOCK: designDocBlock,
    CHANGES_BLOCK: changesBlock
  });
}

function buildChangesBlock(committedDiff, changedFiles, stagedDiff, unstagedDiff) {
  const parts = [];
  if (committedDiff) {
    parts.push("Committed changes (last commit):\n" + committedDiff);
  }
  if (changedFiles && !committedDiff) {
    parts.push("Changed files (since last commit):\n" + changedFiles);
  }
  if (stagedDiff) {
    parts.push("Staged changes:\n" + stagedDiff);
  }
  if (unstagedDiff) {
    parts.push("Unstaged changes:\n" + unstagedDiff);
  }
  if (parts.length === 0) {
    return "No uncommitted changes detected.";
  }
  return parts.join("\n\n");
}

function buildSetupNote(cwd) {
  const availability = getCodexAvailability(cwd);
  if (availability.available) {
    return null;
  }

  const detail = availability.detail ? ` ${availability.detail}.` : "";
  return `Codex is not set up for the review gate.${detail} Run /codex:setup.`;
}

function parseStopReviewOutput(rawOutput) {
  const text = String(rawOutput ?? "").trim();
  if (!text) {
    return {
      ok: false,
      reason:
        "The stop-time Codex review task returned no final output. Run /codex:review --wait manually or bypass the gate."
    };
  }

  const lines = text.split(/\r?\n/);
  const firstLine = lines[0].trim();
  if (firstLine.startsWith("ALLOW:")) {
    return { ok: true, reason: null, detail: null };
  }
  if (firstLine.startsWith("BLOCK:")) {
    const reason = firstLine.slice("BLOCK:".length).trim() || text;
    const detailLines = lines.slice(1).filter((l) => l.trim().startsWith("- "));
    const detail = detailLines.length > 0
      ? detailLines.map((l) => l.trim()).join("\n")
      : null;
    return {
      ok: false,
      reason: `Codex stop-time review found issues that still need fixes before ending the session: ${reason}`,
      detail
    };
  }

  return {
    ok: false,
    reason:
      "The stop-time Codex review task returned an unexpected answer. Run /codex:review --wait manually or bypass the gate.",
    detail: null
  };
}

function runStopReview(cwd, input = {}, config = {}, workspaceRoot = "") {
  const scriptPath = path.join(SCRIPT_DIR, "codex-companion.mjs");
  const prompt = buildStopReviewPrompt(input, config, workspaceRoot);
  const childEnv = {
    ...process.env,
    ...(input.session_id ? { [SESSION_ID_ENV]: input.session_id } : {})
  };
  const result = spawnSync(process.execPath, [scriptPath, "task", "--json", prompt], {
    cwd,
    env: childEnv,
    encoding: "utf8",
    timeout: STOP_REVIEW_TIMEOUT_MS
  });

  if (result.error?.code === "ETIMEDOUT") {
    return {
      ok: false,
      reason:
        "The stop-time Codex review task timed out after 15 minutes. Run /codex:review --wait manually or bypass the gate."
    };
  }

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    return {
      ok: false,
      reason: detail
        ? `The stop-time Codex review task failed: ${detail}`
        : "The stop-time Codex review task failed. Run /codex:review --wait manually or bypass the gate."
    };
  }

  try {
    const payload = JSON.parse(result.stdout);
    return parseStopReviewOutput(payload?.rawOutput);
  } catch {
    return {
      ok: false,
      reason:
        "The stop-time Codex review task returned invalid JSON. Run /codex:review --wait manually or bypass the gate."
    };
  }
}

const DEBUG_LOG = path.join(os.tmpdir(), "codex-stop-gate-debug.log");

function debugLog(...args) {
  const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  try {
    fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${line}\n`);
  } catch { /* ignore */ }
}

function main() {
  const input = readHookInput();
  debugLog("INPUT:", input);
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  debugLog("CWD:", cwd, "ENV_CLAUDE_PROJECT_DIR:", process.env.CLAUDE_PROJECT_DIR || "(not set)");
  const workspaceRoot = cwd;
  debugLog("WORKSPACE_ROOT:", workspaceRoot);
  const config = getConfig(workspaceRoot);
  debugLog("STATE_DIR:", resolveStateDir(workspaceRoot));
  debugLog("CONFIG:", config);

  const jobs = sortJobsNewestFirst(filterJobsForCurrentSession(listJobs(workspaceRoot), input));
  const runningJob = jobs.find((job) => job.status === "queued" || job.status === "running");
  const runningTaskNote = runningJob
    ? `Codex task ${runningJob.id} is still running. Check /codex:status and use /codex:cancel ${runningJob.id} if you want to stop it before ending the session.`
    : null;

  if (!config.stopReviewGate) {
    debugLog("SKIP: stopReviewGate is false");
    logNote(runningTaskNote);
    return;
  }

  const setupNote = buildSetupNote(cwd);
  if (setupNote) {
    debugLog("SKIP: Codex not available:", setupNote);
    logNote(setupNote);
    logNote(runningTaskNote);
    return;
  }

  debugLog("PROCEEDING: running stop review");

  const maxRounds = config.stopReviewGateMaxRounds || 3;
  const currentRound = config.stopReviewGateRound || 0;

  if (currentRound >= maxRounds) {
    setConfig(workspaceRoot, "stopReviewGateRound", 0);
    logNote(`Stop-time review gate reached the maximum of ${maxRounds} rounds. Allowing the session to stop.`);
    logNote(runningTaskNote);
    return;
  }

  const review = runStopReview(cwd, input, config, workspaceRoot);
  if (!review.ok) {
    setConfig(workspaceRoot, "stopReviewGateRound", currentRound + 1);
    const detailNote = review.detail ? `\n${review.detail}` : "";
    const roundNote = ` (review round ${currentRound + 1}/${maxRounds})`;
    emitDecision({
      decision: "block",
      reason: runningTaskNote
        ? `${runningTaskNote} ${review.reason}${roundNote}${detailNote}`
        : `${review.reason}${roundNote}${detailNote}`
    });
    return;
  }

  setConfig(workspaceRoot, "stopReviewGateRound", 0);
  logNote(runningTaskNote);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
