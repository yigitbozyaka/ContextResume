import { describe, expect, it } from "vitest";
import type { BaseComparison } from "../src/sensors/git.js";
import type { Snapshot } from "../src/store/snapshot.js";
import { renderMarkdown } from "../src/ui/markdown.js";

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

describe("renderMarkdown", () => {
  it("includes a heading with the branch and repo name", () => {
    const markdown = renderMarkdown(buildSnapshot());
    expect(markdown).toContain("`feature/jwt-auth`");
    expect(markdown).toContain("demo");
  });

  it("includes the intent and next action", () => {
    const snapshot = buildSnapshot();
    const markdown = renderMarkdown(snapshot);
    expect(markdown).toContain(`**What I was doing:** ${snapshot.aiSummary.intent}`);
    expect(markdown).toContain(`**Next step:** ${snapshot.aiSummary.nextAction}`);
  });

  it("includes the note when it differs from the intent", () => {
    const snapshot = buildSnapshot({ note: "Different from intent" });
    const markdown = renderMarkdown(snapshot);
    expect(markdown).toContain("**Note:** Different from intent");
  });

  it("omits the note when it matches the intent", () => {
    const snapshot = buildSnapshot({ note: "Rewriting the auth token refresh flow." });
    const markdown = renderMarkdown(snapshot);
    expect(markdown).not.toContain("**Note:**");
  });

  it("omits the note line when there is no note", () => {
    const markdown = renderMarkdown(buildSnapshot());
    expect(markdown).not.toContain("**Note:**");
  });

  it("includes the last failing command and error when present", () => {
    const snapshot = buildSnapshot({
      terminal: {
        lastCommands: [],
        lastCommand: "pnpm test",
        exitCode: 1,
        errorSnippet: "Error: expected 1 to be 2",
      },
    });
    const markdown = renderMarkdown(snapshot);
    expect(markdown).toContain("**Last failing command:** `pnpm test` (exit code 1)");
    expect(markdown).toContain("**Error:** Error: expected 1 to be 2");
  });

  it("omits the last failing command when there is none", () => {
    const markdown = renderMarkdown(buildSnapshot({ terminal: { lastCommands: [] } }));
    expect(markdown).not.toContain("**Last failing command:**");
    expect(markdown).not.toContain("**Error:**");
  });

  it("omits the last failing command when the exit code is zero", () => {
    const snapshot = buildSnapshot({
      terminal: { lastCommands: [], lastCommand: "pnpm test", exitCode: 0 },
    });
    const markdown = renderMarkdown(snapshot);
    expect(markdown).not.toContain("**Last failing command:**");
  });

  it("omits the error line when there is a failing command but no snippet", () => {
    const snapshot = buildSnapshot({
      terminal: { lastCommands: [], lastCommand: "pnpm test", exitCode: 1 },
    });
    const markdown = renderMarkdown(snapshot);
    expect(markdown).toContain("**Last failing command:**");
    expect(markdown).not.toContain("**Error:**");
  });

  it("lists changed files as backticked bullets with the diff stat", () => {
    const snapshot = buildSnapshot({
      git: { modifiedFiles: ["src/auth.ts", "src/index.ts"], diffStat: "2 files changed" },
    });
    const markdown = renderMarkdown(snapshot);
    expect(markdown).toContain("**Changed files** (2 files changed):");
    expect(markdown).toContain("- `src/auth.ts`");
    expect(markdown).toContain("- `src/index.ts`");
  });

  it("omits the changed files section when there are none", () => {
    const markdown = renderMarkdown(
      buildSnapshot({ git: { modifiedFiles: [], diffStat: "clean" } }),
    );
    expect(markdown).not.toContain("**Changed files**");
  });

  it("renders the while away line with gained commits and overlap", () => {
    const base: BaseComparison = {
      branch: "main",
      aheadBy: 1,
      behindBy: 4,
      overlappingFiles: ["src/auth.ts"],
    };
    const markdown = renderMarkdown(buildSnapshot(), base);
    expect(markdown).toContain("**While away:**");
    expect(markdown).toContain("gained 4 commits");
    expect(markdown).toContain("`src/auth.ts`");
  });

  it("renders has not moved and no overlap when base has not changed", () => {
    const base: BaseComparison = {
      branch: "main",
      aheadBy: 0,
      behindBy: 0,
      overlappingFiles: [],
    };
    const markdown = renderMarkdown(buildSnapshot(), base);
    expect(markdown).toContain("has not moved");
    expect(markdown).toContain("no overlap");
  });

  it("omits the while away line when there is no base comparison", () => {
    const markdown = renderMarkdown(buildSnapshot());
    expect(markdown).not.toContain("**While away:**");
  });

  it("adds recent commands and a diff excerpt block with full: true", () => {
    const snapshot = buildSnapshot({
      terminal: {
        lastCommands: [
          { ts: "2026-01-01T00:00:00.000Z", cwd: "/repos/demo", cmd: "pnpm test", exitCode: 1 },
        ],
      },
      git: { modifiedFiles: [], diffStat: "clean", diffExcerpt: "-old\n+new" },
    });
    const markdown = renderMarkdown(snapshot, undefined, { full: true });
    expect(markdown).toContain("**Recent commands:**");
    expect(markdown).toContain("- `pnpm test` (exit 1)");
    expect(markdown).toContain("<details><summary>Diff excerpt</summary>");
    expect(markdown).toContain("```diff");
    expect(markdown).toContain("-old\n+new");
  });

  it("omits recent commands and diff excerpt without full", () => {
    const snapshot = buildSnapshot({
      terminal: {
        lastCommands: [
          { ts: "2026-01-01T00:00:00.000Z", cwd: "/repos/demo", cmd: "pnpm test", exitCode: 1 },
        ],
      },
      git: { modifiedFiles: [], diffStat: "clean", diffExcerpt: "-old\n+new" },
    });
    const markdown = renderMarkdown(snapshot);
    expect(markdown).not.toContain("**Recent commands:**");
    expect(markdown).not.toContain("<details>");
    expect(markdown).not.toContain("```diff");
  });

  it("ends with the provider line and a trailing newline", () => {
    const snapshot = buildSnapshot();
    const markdown = renderMarkdown(snapshot);
    expect(markdown.endsWith(`_Summary by ${snapshot.aiSummary.provider}._\n`)).toBe(true);
  });
});
