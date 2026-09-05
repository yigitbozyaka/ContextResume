import pc from "picocolors";
import { listLatest, type Snapshot } from "../store/snapshot.js";
import { relativeTime } from "../ui/card.js";

export interface StandupOptions {
  since?: string | undefined;
  format?: string | undefined;
}

const durationPattern = /^(\d+)\s*(m|h|d|w)$/i;
const unitMs: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

export function parseDuration(text: string): number {
  const match = durationPattern.exec(text.trim());
  const unit = match?.[2]?.toLowerCase();
  if (!match || !unit)
    throw new Error(`Invalid duration "${text}". Use forms like 24h, 2d, 90m, 1w.`);
  return Number(match[1]) * (unitMs[unit] as number);
}

export function selectSnapshots(
  snapshots: Snapshot[],
  sinceMs: number,
  now = Date.now(),
): Snapshot[] {
  const cutoff = now - sinceMs;
  return snapshots.filter((s) => new Date(s.timestamp).getTime() >= cutoff);
}

export function groupByRepo(snapshots: Snapshot[]): Map<string, Snapshot[]> {
  const groups = new Map<string, Snapshot[]>();
  for (const snapshot of snapshots) {
    const key = snapshot.repo.name;
    groups.set(key, [...(groups.get(key) ?? []), snapshot]);
  }
  return groups;
}

export function renderStandup(snapshots: Snapshot[], since: string, markdown: boolean): string {
  const lines: string[] = [
    markdown ? `## Standup, last ${since}` : pc.bold(`Standup, last ${since}`),
    "",
  ];
  if (!snapshots.length) {
    lines.push(markdown ? "_No activity recorded._" : pc.dim("No activity recorded."));
    return `${lines.join("\n")}\n`;
  }
  for (const [repo, group] of groupByRepo(snapshots)) {
    lines.push(markdown ? `### ${repo}` : pc.cyan(repo));
    for (const s of group) {
      const when = relativeTime(s.timestamp);
      const failing = s.terminal.lastCommand ? ` Blocked on \`${s.terminal.lastCommand}\`.` : "";
      if (markdown) {
        lines.push(
          `- **${s.repo.branch}** (${when}): ${s.aiSummary.intent} Next: ${s.aiSummary.nextAction}${failing}`,
        );
      } else {
        lines.push(`  ${pc.bold(s.repo.branch)} ${pc.dim(when)}`);
        lines.push(`    ${s.aiSummary.intent}`);
        lines.push(`    ${pc.dim("next:")} ${s.aiSummary.nextAction}`);
        if (s.terminal.lastCommand)
          lines.push(`    ${pc.red("blocked:")} ${s.terminal.lastCommand}`);
      }
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export async function standupCommand(options: StandupOptions): Promise<void> {
  const since = options.since ?? "24h";
  const snapshots = selectSnapshots(await listLatest(), parseDuration(since));
  process.stdout.write(renderStandup(snapshots, since, options.format === "markdown"));
}
