import { describe, expect, it } from "vitest";
import type { BaseComparison } from "../src/sensors/git.js";
import type { Snapshot } from "../src/store/snapshot.js";
import { relativeTime, renderCard } from "../src/ui/card.js";

const ansiPattern = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*",
    "(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)",
    "|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  ].join(""),
  "g",
);

function stripAnsi(text: string): string {
  return text.replace(ansiPattern, "");
}

function buildSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    version: "2.0",
    repoId: "repo-a",
    repo: { name: "demo", path: "/repos/demo", branch: "feature/jwt-auth", commit: "abc1234" },
    timestamp: "2026-01-01T00:00:00.000Z",
    git: { modifiedFiles: [], diffStat: "clean" },
    terminal: { lastCommands: [] },
    aiSummary: {
      intent: "Rewriting the auth token refresh flow.",
      nextAction: "Fix the failure and rerun: pnpm test",
      provider: "heuristic",
    },
    ...overrides,
  };
}

describe("relativeTime", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");

  it("formats two days ago", () => {
    const iso = new Date(now.getTime() - 2 * 86400 * 1000).toISOString();
    expect(relativeTime(iso, now)).toBe("2 days ago");
  });

  it("formats three hours ago", () => {
    const iso = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
    expect(relativeTime(iso, now)).toBe("3 hours ago");
  });

  it("formats five minutes ago", () => {
    const iso = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(iso, now)).toBe("5 minutes ago");
  });

  it("formats just now for sub-minute differences", () => {
    const iso = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(relativeTime(iso, now)).toBe("just now");
  });
});

describe("renderCard", () => {
  it("includes the branch, intent, and next step", () => {
    const snapshot = buildSnapshot();
    const card = stripAnsi(renderCard(snapshot));
    expect(card).toContain("feature/jwt-auth");
    expect(card).toContain("WHAT YOU WERE DOING");
    expect(card).toContain(snapshot.aiSummary.intent);
    expect(card).toContain("NEXT STEP");
  });

  it("includes the last failing command when present", () => {
    const snapshot = buildSnapshot({
      terminal: { lastCommands: [], lastCommand: "pnpm test", exitCode: 1 },
    });
    const card = stripAnsi(renderCard(snapshot));
    expect(card).toContain("LAST FAILING COMMAND");
    expect(card).toContain("pnpm test");
  });

  it("omits the last failing command when there is none", () => {
    const snapshot = buildSnapshot({ terminal: { lastCommands: [] } });
    const card = stripAnsi(renderCard(snapshot));
    expect(card).not.toContain("LAST FAILING COMMAND");
  });

  it("omits the last failing command when the exit code is zero", () => {
    const snapshot = buildSnapshot({
      terminal: { lastCommands: [], lastCommand: "pnpm test", exitCode: 0 },
    });
    const card = stripAnsi(renderCard(snapshot));
    expect(card).not.toContain("LAST FAILING COMMAND");
  });

  it("shows the base comparison when provided", () => {
    const snapshot = buildSnapshot();
    const base: BaseComparison = {
      branch: "main",
      aheadBy: 1,
      behindBy: 4,
      overlappingFiles: ["src/auth.ts"],
    };
    const card = stripAnsi(renderCard(snapshot, base));
    expect(card).toContain("WHILE YOU WERE AWAY");
    expect(card).toContain("gained 4 commits");
    expect(card).toContain("src/auth.ts");
  });
});
