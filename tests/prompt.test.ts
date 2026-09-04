import { describe, expect, it } from "vitest";
import type { BrainInput } from "../src/brain/prompt.js";
import { buildPrompt, parseSummary } from "../src/brain/prompt.js";

function buildInput(overrides: Partial<BrainInput> = {}): BrainInput {
  return {
    branch: "feature/jwt-auth",
    git: { modifiedFiles: ["src/auth/token.ts"], diffStat: "1 file changed" },
    terminal: { lastCommands: [] },
    ...overrides,
  };
}

describe("buildPrompt", () => {
  it("includes the branch name", () => {
    const prompt = buildPrompt(buildInput({ branch: "feature/jwt-auth" }));
    expect(prompt).toContain('branch "feature/jwt-auth"');
  });

  it("includes the note when given", () => {
    const prompt = buildPrompt(buildInput({ note: "Rewriting the token refresh flow." }));
    expect(prompt).toContain("Developer note: Rewriting the token refresh flow.");
  });

  it("omits the Developer note line when the note is absent", () => {
    const prompt = buildPrompt(buildInput({ note: undefined }));
    expect(prompt).not.toContain("Developer note");
  });

  it("includes the modified file list and diffStat", () => {
    const prompt = buildPrompt(
      buildInput({
        git: {
          modifiedFiles: ["src/auth/token.ts", "src/auth/refresh.ts"],
          diffStat: "2 files changed",
        },
      }),
    );
    expect(prompt).toContain(
      "Changed files (2 files changed): src/auth/token.ts, src/auth/refresh.ts",
    );
  });

  it("includes recent commands with their exit codes", () => {
    const prompt = buildPrompt(
      buildInput({
        terminal: {
          lastCommands: [
            { ts: "2026-01-01T00:00:00.000Z", cwd: "/repo", cmd: "pnpm test", exitCode: 1 },
            { ts: "2026-01-01T00:00:01.000Z", cwd: "/repo", cmd: "pnpm build", exitCode: 0 },
          ],
        },
      }),
    );
    expect(prompt).toContain("Recent commands:");
    expect(prompt).toContain("[exit 1] pnpm test");
    expect(prompt).toContain("[exit 0] pnpm build");
  });

  it("omits the Recent commands line when there are none", () => {
    const prompt = buildPrompt(buildInput({ terminal: { lastCommands: [] } }));
    expect(prompt).not.toContain("Recent commands");
  });

  it("includes the failing command", () => {
    const prompt = buildPrompt(
      buildInput({ terminal: { lastCommands: [], lastCommand: "pnpm test", exitCode: 1 } }),
    );
    expect(prompt).toContain("Last failing command: pnpm test");
  });

  it("includes the error snippet", () => {
    const prompt = buildPrompt(
      buildInput({ terminal: { lastCommands: [], errorSnippet: "TypeError: boom" } }),
    );
    expect(prompt).toContain("Error: TypeError: boom");
  });

  it("includes the diff excerpt", () => {
    const prompt = buildPrompt(
      buildInput({
        git: {
          modifiedFiles: ["src/auth/token.ts"],
          diffStat: "1 file changed",
          diffExcerpt: "+ const token = refresh();",
        },
      }),
    );
    expect(prompt).toContain("Diff excerpt:\n+ const token = refresh();");
  });

  it("omits the Diff excerpt line when absent", () => {
    const prompt = buildPrompt(buildInput({ git: { modifiedFiles: [], diffStat: "clean" } }));
    expect(prompt).not.toContain("Diff excerpt");
  });

  it("always contains the JSON instruction with the intent, lastError, nextAction keys", () => {
    const prompt = buildPrompt(buildInput());
    expect(prompt).toContain('"intent"');
    expect(prompt).toContain('"lastError"');
    expect(prompt).toContain('"nextAction"');
  });
});

describe("parseSummary", () => {
  it("parses a bare JSON object", () => {
    const result = parseSummary(
      '{"intent":"Refactoring auth","lastError":"boom","nextAction":"Fix it"}',
      "test",
    );
    expect(result).toEqual({
      intent: "Refactoring auth",
      lastError: "boom",
      nextAction: "Fix it",
      provider: "test",
    });
  });

  it("parses JSON wrapped in markdown fences", () => {
    const text =
      '```json\n{"intent":"Refactoring auth","lastError":null,"nextAction":"Fix it"}\n```';
    const result = parseSummary(text, "test");
    expect(result).toEqual({ intent: "Refactoring auth", nextAction: "Fix it", provider: "test" });
  });

  it("parses JSON preceded and followed by prose", () => {
    const text =
      'Sure, here is the summary:\n{"intent":"Refactoring auth","lastError":null,"nextAction":"Fix it"}\nLet me know if you need more.';
    const result = parseSummary(text, "test");
    expect(result).toEqual({ intent: "Refactoring auth", nextAction: "Fix it", provider: "test" });
  });

  it("treats lastError: null as absent", () => {
    const result = parseSummary(
      '{"intent":"Refactoring auth","lastError":null,"nextAction":"Fix it"}',
      "test",
    );
    expect(result).toBeDefined();
    expect("lastError" in (result ?? {})).toBe(false);
  });

  it("trims whitespace", () => {
    const result = parseSummary(
      '{"intent":"  Refactoring auth  ","lastError":"  boom  ","nextAction":"  Fix it  "}',
      "test",
    );
    expect(result).toEqual({
      intent: "Refactoring auth",
      lastError: "boom",
      nextAction: "Fix it",
      provider: "test",
    });
  });

  it("sets provider to the given string", () => {
    const result = parseSummary('{"intent":"x","lastError":null,"nextAction":"y"}', "claude:haiku");
    expect(result?.provider).toBe("claude:haiku");
  });

  it("returns undefined for non-JSON text", () => {
    expect(parseSummary("not json at all", "test")).toBeUndefined();
  });

  it("returns undefined for a JSON array", () => {
    expect(parseSummary('["intent","lastError","nextAction"]', "test")).toBeUndefined();
  });

  it("returns undefined for missing intent", () => {
    expect(parseSummary('{"lastError":null,"nextAction":"Fix it"}', "test")).toBeUndefined();
  });

  it("returns undefined for empty intent", () => {
    expect(
      parseSummary('{"intent":"   ","lastError":null,"nextAction":"Fix it"}', "test"),
    ).toBeUndefined();
  });

  it("returns undefined for missing nextAction", () => {
    expect(parseSummary('{"intent":"Refactoring auth","lastError":null}', "test")).toBeUndefined();
  });

  it("returns undefined for empty nextAction", () => {
    expect(
      parseSummary('{"intent":"Refactoring auth","lastError":null,"nextAction":""}', "test"),
    ).toBeUndefined();
  });

  it("returns undefined for non-string intent", () => {
    expect(
      parseSummary('{"intent":123,"lastError":null,"nextAction":"Fix it"}', "test"),
    ).toBeUndefined();
  });

  it("returns undefined for non-string nextAction", () => {
    expect(
      parseSummary('{"intent":"Refactoring auth","lastError":null,"nextAction":123}', "test"),
    ).toBeUndefined();
  });
});
