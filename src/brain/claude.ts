import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Summary } from "../store/snapshot.js";
import { type BrainInput, buildPrompt, parseSummary } from "./prompt.js";

function runClaude(args: string[], stdin: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(`claude ${args.join(" ")}`, {
      cwd: tmpdir(),
      shell: true,
      signal,
      stdio: ["pipe", "pipe", "ignore"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`claude exited with ${code}`)),
    );
    child.stdin.end(stdin);
  });
}

export function claudeModel(): string {
  return process.env.CTXR_CLAUDE_MODEL ?? "haiku";
}

export async function claudeAvailable(): Promise<boolean> {
  try {
    await runClaude(["--version"], "", AbortSignal.timeout(5000));
    return true;
  } catch {
    return false;
  }
}

async function emptyMcpConfigPath(): Promise<string> {
  const path = join(tmpdir(), "ctxr-empty-mcp.json");
  await writeFile(path, '{"mcpServers":{}}');
  return path;
}

export async function summarizeWithClaude(
  input: BrainInput,
  signal: AbortSignal,
): Promise<Summary | undefined> {
  const model = claudeModel();
  const args = [
    "-p",
    "--model",
    model,
    "--output-format",
    "json",
    "--strict-mcp-config",
    "--mcp-config",
    `"${await emptyMcpConfigPath()}"`,
  ];
  const raw = await runClaude(args, buildPrompt(input), signal);
  const envelope = JSON.parse(raw) as { result?: unknown };
  if (typeof envelope.result !== "string") return undefined;
  return parseSummary(envelope.result, `claude:${model}`);
}
