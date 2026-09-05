import { describe, expect, test } from "vitest";
import {
  groupByRepo,
  parseDuration,
  renderStandup,
  selectSnapshots,
} from "../src/commands/standup.js";
import type { Snapshot } from "../src/store/snapshot.js";

const hour = 3_600_000;
const now = Date.parse("2026-09-05T12:00:00Z");

function snapshot(repo: string, branch: string, hoursAgo: number, lastCommand?: string): Snapshot {
  return {
    version: "2.0",
    repoId: repo,
    repo: { name: repo, path: `/${repo}`, branch, commit: "abc1234" },
    timestamp: new Date(now - hoursAgo * hour).toISOString(),
    git: { modifiedFiles: [], diffStat: "clean" },
    terminal: lastCommand ? { lastCommands: [], lastCommand, exitCode: 1 } : { lastCommands: [] },
    aiSummary: {
      intent: `Working on ${branch}`,
      nextAction: `Finish ${branch}`,
      provider: "heuristic",
    },
  };
}

describe("parseDuration", () => {
  test("accepts minutes, hours, days, and weeks", () => {
    expect(parseDuration("90m")).toBe(90 * 60_000);
    expect(parseDuration("24h")).toBe(24 * hour);
    expect(parseDuration("2d")).toBe(48 * hour);
    expect(parseDuration("1w")).toBe(168 * hour);
  });

  test("rejects other forms", () => {
    expect(() => parseDuration("yesterday")).toThrow("Invalid duration");
  });
});

describe("selectSnapshots and groupByRepo", () => {
  test("keeps only snapshots inside the window and groups them per repo", () => {
    const all = [
      snapshot("api", "feat/a", 2),
      snapshot("api", "fix/b", 30),
      snapshot("web", "feat/c", 5),
    ];
    const recent = selectSnapshots(all, 24 * hour, now);
    expect(recent.map((s) => s.repo.branch)).toEqual(["feat/a", "feat/c"]);
    expect([...groupByRepo(recent).keys()]).toEqual(["api", "web"]);
  });
});

describe("renderStandup", () => {
  test("renders markdown grouped by repo with blockers", () => {
    const text = renderStandup(
      [snapshot("api", "feat/a", 2, "pnpm test"), snapshot("web", "feat/c", 5)],
      "24h",
      true,
    );
    expect(text).toContain("## Standup, last 24h");
    expect(text).toContain("### api");
    expect(text).toContain("- **feat/a**");
    expect(text).toContain("Blocked on `pnpm test`.");
    expect(text).toContain("### web");
    expect(text.endsWith("\n")).toBe(true);
  });

  test("says so when nothing happened", () => {
    expect(renderStandup([], "24h", true)).toContain("_No activity recorded._");
  });
});
