import { describe, expect, it } from "vitest";
import { summarize } from "../src/brain/heuristic.js";

describe("summarize", () => {
  it("uses the note as the intent when provided", () => {
    const summary = summarize({
      note: "Rewriting the auth token refresh flow.",
      git: { modifiedFiles: ["src/auth/token.ts"], diffStat: "1 file changed" },
      terminal: { lastCommands: [] },
    });
    expect(summary.intent).toBe("Rewriting the auth token refresh flow.");
  });

  it("describes the touched files when there is no note", () => {
    const summary = summarize({
      git: {
        modifiedFiles: ["src/auth/token.ts", "src/auth/refresh.ts", "tests/auth.test.ts"],
        diffStat: "3 files changed",
      },
      terminal: { lastCommands: [] },
    });
    expect(summary.intent).toContain("Editing 3 files");
    expect(summary.intent).toContain("in src/auth");
    expect(summary.intent).toContain("1 test file");
  });

  it("tells you to rerun a failing command and sets lastError", () => {
    const summary = summarize({
      git: { modifiedFiles: [], diffStat: "clean" },
      terminal: { lastCommands: [], lastCommand: "pnpm test", exitCode: 1 },
    });
    expect(summary.nextAction).toBe("Fix the failure and rerun: pnpm test");
    expect(summary.lastError).toBe("pnpm test (exit code 1)");
  });

  it("mentions the test file when there is no failing command", () => {
    const summary = summarize({
      git: { modifiedFiles: ["tests/auth.test.ts"], diffStat: "1 file changed" },
      terminal: { lastCommands: [] },
    });
    expect(summary.nextAction).toContain("tests/auth.test.ts");
  });

  it("gives the clean-tree message when there are no files", () => {
    const summary = summarize({
      git: { modifiedFiles: [], diffStat: "clean" },
      terminal: { lastCommands: [] },
    });
    expect(summary.intent).toBe("No uncommitted changes.");
    expect(summary.nextAction).toBe("Working tree was clean. Pick up from the last commit.");
  });

  it("reports the heuristic provider", () => {
    const summary = summarize({
      git: { modifiedFiles: [], diffStat: "clean" },
      terminal: { lastCommands: [] },
    });
    expect(summary.provider).toBe("heuristic");
  });

  it("omits lastError entirely when there is no error", () => {
    const summary = summarize({
      git: { modifiedFiles: [], diffStat: "clean" },
      terminal: { lastCommands: [] },
    });
    expect("lastError" in summary).toBe(false);
  });
});
