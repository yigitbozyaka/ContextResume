import type { Snapshot, Summary } from "../store/snapshot.js";

export interface BrainInput {
  branch: string;
  note?: string | undefined;
  git: Snapshot["git"];
  terminal: Snapshot["terminal"];
}

export function buildPrompt({ branch, note, git, terminal }: BrainInput): string {
  const sections = [
    `You summarize what a developer was doing on git branch "${branch}" so they can resume later.`,
    "Answer with ONLY a JSON object, no prose, no markdown fences:",
    '{"intent": "<one sentence, past continuous, what they were working on>", "lastError": "<the blocking error in one line, or null>", "nextAction": "<one concrete next step, imperative>"}',
    "",
    note ? `Developer note: ${note}` : undefined,
    `Changed files (${git.diffStat}): ${git.modifiedFiles.join(", ") || "none"}`,
    terminal.lastCommands.length
      ? `Recent commands:\n${terminal.lastCommands.map((c) => `  [exit ${c.exitCode}] ${c.cmd}`).join("\n")}`
      : undefined,
    terminal.lastCommand ? `Last failing command: ${terminal.lastCommand}` : undefined,
    terminal.errorSnippet ? `Error: ${terminal.errorSnippet}` : undefined,
    git.diffExcerpt ? `Diff excerpt:\n${git.diffExcerpt}` : undefined,
  ];
  return sections.filter((s) => s !== undefined).join("\n");
}

export function parseSummary(text: string, provider: string): Summary | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const { intent, lastError, nextAction } = parsed as Record<string, unknown>;
  if (!isText(intent) || !isText(nextAction)) return undefined;
  return isText(lastError)
    ? {
        intent: intent.trim(),
        lastError: lastError.trim(),
        nextAction: nextAction.trim(),
        provider,
      }
    : { intent: intent.trim(), nextAction: nextAction.trim(), provider };
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
