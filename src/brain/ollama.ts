import type { Summary } from "../store/snapshot.js";
import { type BrainInput, buildPrompt, parseSummary } from "./prompt.js";

export function ollamaHost(): string {
  return process.env.CTXR_OLLAMA_HOST ?? "http://localhost:11434";
}

export function pickModel(installed: string[]): string | undefined {
  const preferred =
    installed.find((m) => /coder/i.test(m)) ?? installed.find((m) => /qwen/i.test(m));
  return process.env.CTXR_OLLAMA_MODEL ?? preferred ?? installed[0];
}

export async function installedModels(signal: AbortSignal): Promise<string[]> {
  const response = await fetch(`${ollamaHost()}/api/tags`, { signal });
  if (!response.ok) return [];
  const body = (await response.json()) as { models?: { name: string }[] };
  return (body.models ?? []).map((m) => m.name);
}

export async function ollamaAvailable(): Promise<boolean> {
  try {
    return (await installedModels(AbortSignal.timeout(1500))).length > 0;
  } catch {
    return false;
  }
}

export async function summarizeWithOllama(
  input: BrainInput,
  signal: AbortSignal,
): Promise<Summary | undefined> {
  const model = pickModel(await installedModels(signal));
  if (!model) return undefined;
  const response = await fetch(`${ollamaHost()}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(input),
      stream: false,
      format: "json",
      options: { temperature: 0 },
    }),
    signal,
  });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { response?: unknown };
  return typeof body.response === "string"
    ? parseSummary(body.response, `ollama:${model}`)
    : undefined;
}
