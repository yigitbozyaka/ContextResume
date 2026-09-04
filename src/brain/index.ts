import type { Summary } from "../store/snapshot.js";
import { claudeAvailable, summarizeWithClaude } from "./claude.js";
import { summarize as summarizeHeuristically } from "./heuristic.js";
import { ollamaAvailable, summarizeWithOllama } from "./ollama.js";
import type { BrainInput } from "./prompt.js";

export interface Brain {
  name: string;
  available(): Promise<boolean>;
  summarize(input: BrainInput, signal: AbortSignal): Promise<Summary | undefined>;
}

export const claudeBrain: Brain = {
  name: "claude",
  available: claudeAvailable,
  summarize: summarizeWithClaude,
};

export const ollamaBrain: Brain = {
  name: "ollama",
  available: ollamaAvailable,
  summarize: summarizeWithOllama,
};

export const heuristicBrain: Brain = {
  name: "heuristic",
  available: async () => true,
  summarize: async (input) => summarizeHeuristically(input),
};

export const defaultBrains: Brain[] = [claudeBrain, ollamaBrain, heuristicBrain];
export const defaultTimeoutMs = 30000;

export function brainTimeoutMs(): number {
  const configured = Number(process.env.CTXR_BRAIN_TIMEOUT);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultTimeoutMs;
}

export interface SummarizeOptions {
  brains?: Brain[];
  pin?: string | undefined;
  timeoutMs?: number;
  onAttempt?: (brain: string) => void;
}

export async function summarizeWithBrains(
  input: BrainInput,
  options: SummarizeOptions = {},
): Promise<Summary> {
  const brains = options.brains ?? defaultBrains;
  const pin = options.pin ?? process.env.CTXR_BRAIN;
  const candidates = pin ? brains.filter((b) => b.name === pin) : brains;
  if (pin && !candidates.length) {
    throw new Error(`Unknown brain "${pin}". Use one of: ${brains.map((b) => b.name).join(", ")}.`);
  }
  for (const brain of candidates) {
    if (!(await brain.available())) continue;
    options.onAttempt?.(brain.name);
    try {
      const summary = await brain.summarize(
        input,
        AbortSignal.timeout(options.timeoutMs ?? brainTimeoutMs()),
      );
      if (summary) return summary;
      debug(`${brain.name} returned no usable summary`);
    } catch (error) {
      debug(`${brain.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return summarizeHeuristically(input);
}

function debug(message: string): void {
  if (process.env.CTXR_DEBUG) console.error(`[ctxr] ${message}`);
}
