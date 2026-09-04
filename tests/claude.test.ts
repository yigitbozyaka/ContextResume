import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claudeModel } from "../src/brain/claude.js";
import { parseSummary } from "../src/brain/prompt.js";

describe("claudeModel", () => {
  let originalModel: string | undefined;

  beforeEach(() => {
    originalModel = process.env.CTXR_CLAUDE_MODEL;
    delete process.env.CTXR_CLAUDE_MODEL;
  });

  afterEach(() => {
    if (originalModel === undefined) delete process.env.CTXR_CLAUDE_MODEL;
    else process.env.CTXR_CLAUDE_MODEL = originalModel;
  });

  it("defaults to haiku", () => {
    expect(claudeModel()).toBe("haiku");
  });

  it("honours CTXR_CLAUDE_MODEL", () => {
    process.env.CTXR_CLAUDE_MODEL = "opus";
    expect(claudeModel()).toBe("opus");
  });
});

describe("parseSummary against a claude -p --output-format json envelope", () => {
  it("parses the fenced JSON result string summarizeWithClaude feeds it", () => {
    const envelope = {
      result: '```json\n{"intent":"Refactoring auth","lastError":null,"nextAction":"Fix it"}\n```',
    };
    const raw = JSON.stringify(envelope);
    const parsedEnvelope = JSON.parse(raw) as { result: string };
    const result = parseSummary(parsedEnvelope.result, "claude:haiku");
    expect(result).toEqual({
      intent: "Refactoring auth",
      nextAction: "Fix it",
      provider: "claude:haiku",
    });
  });
});
