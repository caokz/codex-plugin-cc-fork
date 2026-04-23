import fs from "node:fs";
import path from "node:path";

const STOP_REVIEW_GATE_PRESETS = new Set(["default", "code-quality", "security", "performance", "trading-system"]);

export function loadPromptTemplate(rootDir, name) {
  const promptPath = path.join(rootDir, "prompts", `${name}.md`);
  return fs.readFileSync(promptPath, "utf8");
}

export function resolvePromptTemplate(rootDir, configValue, workspaceRoot) {
  if (configValue && STOP_REVIEW_GATE_PRESETS.has(configValue)) {
    return loadPromptTemplate(rootDir, `stop-review-gate-${configValue}`);
  }

  if (configValue && typeof configValue === "string") {
    const resolved = path.isAbsolute(configValue) ? configValue : path.resolve(workspaceRoot, configValue);
    if (fs.existsSync(resolved)) {
      return fs.readFileSync(resolved, "utf8");
    }
  }

  return loadPromptTemplate(rootDir, "stop-review-gate-default");
}

export function interpolateTemplate(template, variables) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : "";
  });
}
