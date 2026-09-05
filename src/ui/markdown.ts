import type { BaseComparison } from "../sensors/git.js";
import type { Snapshot } from "../store/snapshot.js";
import { relativeTime } from "./card.js";

export interface MarkdownOptions {
  full?: boolean;
}

export function renderMarkdown(
  snapshot: Snapshot,
  base?: BaseComparison,
  options: MarkdownOptions = {},
): string {
  const { repo, timestamp, note, git, terminal, aiSummary } = snapshot;
  const lines = [
    `## ContextResume: \`${repo.branch}\` in ${repo.name}`,
    "",
    `Last active ${relativeTime(timestamp)} (${timestamp}) at commit \`${repo.commit}\`.`,
    "",
    `**What I was doing:** ${aiSummary.intent}`,
  ];
  if (note && note !== aiSummary.intent) lines.push(`**Note:** ${note}`);
  if (terminal.lastCommand && terminal.exitCode) {
    lines.push(
      `**Last failing command:** \`${terminal.lastCommand}\` (exit code ${terminal.exitCode})`,
    );
    if (terminal.errorSnippet) lines.push(`**Error:** ${terminal.errorSnippet}`);
  }
  lines.push(`**Next step:** ${aiSummary.nextAction}`);
  if (git.modifiedFiles.length) {
    lines.push(
      "",
      `**Changed files** (${git.diffStat}):`,
      ...git.modifiedFiles.map((f) => `- \`${f}\``),
    );
  }
  if (base) {
    const gained = base.behindBy
      ? `\`${base.branch}\` gained ${base.behindBy} commit${base.behindBy > 1 ? "s" : ""}`
      : `\`${base.branch}\` has not moved`;
    const overlap = base.overlappingFiles.length
      ? `; overlapping files: ${base.overlappingFiles.map((f) => `\`${f}\``).join(", ")}`
      : "; no overlap with the changed files";
    lines.push("", `**While away:** ${gained}${overlap}.`);
  }
  if (options.full) {
    if (terminal.lastCommands.length) {
      lines.push(
        "",
        "**Recent commands:**",
        ...terminal.lastCommands.map((c) => `- \`${c.cmd}\` (exit ${c.exitCode})`),
      );
    }
    if (git.diffExcerpt) {
      lines.push(
        "",
        "<details><summary>Diff excerpt</summary>",
        "",
        "```diff",
        git.diffExcerpt,
        "```",
        "",
        "</details>",
      );
    }
  }
  lines.push("", `_Summary by ${aiSummary.provider}._`);
  return `${lines.join("\n")}\n`;
}
