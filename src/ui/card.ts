import boxen from "boxen";
import pc from "picocolors";
import type { BaseComparison } from "../sensors/git.js";
import type { Snapshot } from "../store/snapshot.js";

export function relativeTime(iso: string, now = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function renderCard(snapshot: Snapshot, base?: BaseComparison): string {
  const { repo, timestamp, git, terminal, aiSummary, note } = snapshot;
  const when = new Date(timestamp);
  const lines: string[] = [
    `${pc.bold("ContextResume")} ${pc.dim("--")} ${pc.cyan(repo.branch)} ${pc.dim(`(${repo.name})`)}`,
    pc.dim(`Last active: ${when.toLocaleString()} (${relativeTime(timestamp)})`),
    "",
    pc.bold("WHAT YOU WERE DOING"),
    aiSummary.intent,
  ];
  if (note && note !== aiSummary.intent) lines.push(pc.dim(`Note: ${note}`));
  if (git.modifiedFiles.length) {
    lines.push(
      pc.dim(
        `${git.diffStat}: ${git.modifiedFiles.slice(0, 5).join(", ")}${git.modifiedFiles.length > 5 ? ", ..." : ""}`,
      ),
    );
  }
  if (terminal.lastCommand && terminal.exitCode) {
    lines.push(
      "",
      pc.bold(pc.red("LAST FAILING COMMAND")),
      `${terminal.lastCommand} ${pc.dim(`(exit code ${terminal.exitCode})`)}`,
    );
    if (terminal.errorSnippet) lines.push(pc.red(terminal.errorSnippet));
  }
  lines.push("", pc.bold("NEXT STEP"), aiSummary.nextAction);
  if (base) {
    lines.push("", pc.bold("WHILE YOU WERE AWAY"), describeBase(base));
  }
  lines.push("", pc.dim(`summary: ${aiSummary.provider}`));
  return boxen(lines.join("\n"), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    borderColor: "cyan",
    borderStyle: "round",
  });
}

function describeBase(base: BaseComparison): string {
  const gained = base.behindBy
    ? `${base.branch} gained ${base.behindBy} commit${base.behindBy > 1 ? "s" : ""}.`
    : `${base.branch} has not moved.`;
  if (!base.overlappingFiles.length) return `${gained} No overlap with your files.`;
  const files = base.overlappingFiles.slice(0, 3).join(", ");
  const more = base.overlappingFiles.length > 3 ? `, +${base.overlappingFiles.length - 3}` : "";
  return `${gained} ${pc.yellow(`${base.overlappingFiles.length} overlapping file${base.overlappingFiles.length > 1 ? "s" : ""} (${files}${more}), possible conflicts.`)}`;
}
