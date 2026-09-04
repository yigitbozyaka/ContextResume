import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Brain } from "../src/brain/index.js";
import { brainTimeoutMs, defaultTimeoutMs, summarizeWithBrains } from "../src/brain/index.js";
import type { BrainInput } from "../src/brain/prompt.js";
import type { Summary } from "../src/store/snapshot.js";

const input: BrainInput = {
  branch: "main",
  git: { modifiedFiles: [], diffStat: "clean" },
  terminal: { lastCommands: [] },
};

function summaryOf(provider: string): Summary {
  return { intent: "x", nextAction: "y", provider };
}

function stubBrain(overrides: Partial<Brain> & { name: string }): Brain {
  return {
    available: async () => true,
    summarize: async () => summaryOf(overrides.name),
    ...overrides,
  };
}

let originalCtxrBrain: string | undefined;

beforeEach(() => {
  originalCtxrBrain = process.env.CTXR_BRAIN;
  delete process.env.CTXR_BRAIN;
});

afterEach(() => {
  if (originalCtxrBrain === undefined) delete process.env.CTXR_BRAIN;
  else process.env.CTXR_BRAIN = originalCtxrBrain;
});

describe("summarizeWithBrains", () => {
  it("returns the first available brain's summary", async () => {
    const first = stubBrain({ name: "first" });
    const second = stubBrain({ name: "second" });
    const result = await summarizeWithBrains(input, { brains: [first, second] });
    expect(result.provider).toBe("first");
  });

  it("skips an unavailable brain", async () => {
    const unavailable = stubBrain({ name: "first", available: async () => false });
    const second = stubBrain({ name: "second" });
    const result = await summarizeWithBrains(input, { brains: [unavailable, second] });
    expect(result.provider).toBe("second");
  });

  it("falls through to the next brain when one throws", async () => {
    const throwing = stubBrain({
      name: "first",
      summarize: async () => {
        throw new Error("boom");
      },
    });
    const second = stubBrain({ name: "second" });
    const result = await summarizeWithBrains(input, { brains: [throwing, second] });
    expect(result.provider).toBe("second");
  });

  it("falls through to the next brain when one returns undefined", async () => {
    const empty = stubBrain({ name: "first", summarize: async () => undefined });
    const second = stubBrain({ name: "second" });
    const result = await summarizeWithBrains(input, { brains: [empty, second] });
    expect(result.provider).toBe("second");
  });

  it("returns the heuristic summary when every brain fails", async () => {
    const first = stubBrain({
      name: "first",
      summarize: async () => {
        throw new Error("boom");
      },
    });
    const second = stubBrain({ name: "second", summarize: async () => undefined });
    const result = await summarizeWithBrains(input, { brains: [first, second] });
    expect(result.provider).toBe("heuristic");
  });

  it("skips earlier brains when pin is given", async () => {
    const first = stubBrain({ name: "first" });
    const second = stubBrain({ name: "second" });
    const result = await summarizeWithBrains(input, { brains: [first, second], pin: "second" });
    expect(result.provider).toBe("second");
  });

  it("throws for an unknown pin, listing the brain names", async () => {
    const first = stubBrain({ name: "first" });
    const second = stubBrain({ name: "second" });
    await expect(
      summarizeWithBrains(input, { brains: [first, second], pin: "nope" }),
    ).rejects.toThrow("first, second");
  });

  it("abandons a slow brain when it exceeds timeoutMs and uses the next", async () => {
    const slow = stubBrain({
      name: "slow",
      summarize: (_summarizeInput, signal) =>
        new Promise<Summary | undefined>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    const second = stubBrain({ name: "second" });
    const result = await summarizeWithBrains(input, {
      brains: [slow, second],
      timeoutMs: 20,
    });
    expect(result.provider).toBe("second");
  });

  it("calls onAttempt with the names of brains tried, in order", async () => {
    const unavailable = stubBrain({ name: "first", available: async () => false });
    const throwing = stubBrain({
      name: "second",
      summarize: async () => {
        throw new Error("boom");
      },
    });
    const third = stubBrain({ name: "third" });
    const attempts: string[] = [];
    await summarizeWithBrains(input, {
      brains: [unavailable, throwing, third],
      onAttempt: (name) => attempts.push(name),
    });
    expect(attempts).toEqual(["second", "third"]);
  });
});

describe("brainTimeoutMs", () => {
  let originalTimeout: string | undefined;

  beforeEach(() => {
    originalTimeout = process.env.CTXR_BRAIN_TIMEOUT;
    delete process.env.CTXR_BRAIN_TIMEOUT;
  });

  afterEach(() => {
    if (originalTimeout === undefined) delete process.env.CTXR_BRAIN_TIMEOUT;
    else process.env.CTXR_BRAIN_TIMEOUT = originalTimeout;
  });

  it("returns the default when CTXR_BRAIN_TIMEOUT is unset", () => {
    expect(brainTimeoutMs()).toBe(defaultTimeoutMs);
  });

  it("returns the default when CTXR_BRAIN_TIMEOUT is invalid", () => {
    process.env.CTXR_BRAIN_TIMEOUT = "not-a-number";
    expect(brainTimeoutMs()).toBe(defaultTimeoutMs);
  });

  it("returns the parsed number when set", () => {
    process.env.CTXR_BRAIN_TIMEOUT = "5000";
    expect(brainTimeoutMs()).toBe(5000);
  });
});
