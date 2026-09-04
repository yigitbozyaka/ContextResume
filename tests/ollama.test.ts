import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ollamaAvailable, pickModel, summarizeWithOllama } from "../src/brain/ollama.js";
import type { BrainInput } from "../src/brain/prompt.js";

const input: BrainInput = {
  branch: "main",
  git: { modifiedFiles: [], diffStat: "clean" },
  terminal: { lastCommands: [] },
};

describe("pickModel", () => {
  let originalModel: string | undefined;

  beforeEach(() => {
    originalModel = process.env.CTXR_OLLAMA_MODEL;
    delete process.env.CTXR_OLLAMA_MODEL;
  });

  afterEach(() => {
    if (originalModel === undefined) delete process.env.CTXR_OLLAMA_MODEL;
    else process.env.CTXR_OLLAMA_MODEL = originalModel;
  });

  it("prefers a name containing coder", () => {
    expect(pickModel(["llama3", "qwen2.5:7b", "deepseek-coder:6.7b"])).toBe("deepseek-coder:6.7b");
  });

  it("prefers a name containing qwen when no coder model is present", () => {
    expect(pickModel(["llama3", "qwen2.5:7b"])).toBe("qwen2.5:7b");
  });

  it("falls back to the first model when nothing matches", () => {
    expect(pickModel(["llama3", "mistral"])).toBe("llama3");
  });

  it("returns undefined for an empty list", () => {
    expect(pickModel([])).toBeUndefined();
  });

  it("CTXR_OLLAMA_MODEL overrides everything", () => {
    process.env.CTXR_OLLAMA_MODEL = "custom-model";
    expect(pickModel(["deepseek-coder:6.7b"])).toBe("custom-model");
  });
});

describe("summarizeWithOllama", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("posts to /api/generate with the picked model and parses the response", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/tags")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ models: [{ name: "qwen2.5:7b" }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          response: '{"intent":"x","lastError":null,"nextAction":"y"}',
        }),
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await summarizeWithOllama(input, new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const generateCall = fetchMock.mock.calls[1];
    expect(generateCall?.[0]).toBe("http://localhost:11434/api/generate");
    const requestInit = generateCall?.[1] as { method: string; body: string };
    expect(requestInit.method).toBe("POST");
    const body = JSON.parse(requestInit.body);
    expect(body.model).toBe("qwen2.5:7b");
    expect(body.stream).toBe(false);
    expect(body.format).toBe("json");

    expect(result).toEqual({ intent: "x", nextAction: "y", provider: "ollama:qwen2.5:7b" });
  });

  it("returns undefined when there are no installed models", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await summarizeWithOllama(input, new AbortController().signal);
    expect(result).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns undefined when the generate response is not ok", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/tags")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ models: [{ name: "qwen2.5:7b" }] }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await summarizeWithOllama(input, new AbortController().signal);
    expect(result).toBeUndefined();
  });
});

describe("ollamaAvailable", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns false when fetch rejects", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    expect(await ollamaAvailable()).toBe(false);
  });
});
