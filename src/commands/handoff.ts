import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pc from "picocolors";
import type { BaseComparison } from "../sensors/git.js";
import type { Snapshot } from "../store/snapshot.js";
import { renderMarkdown } from "../ui/markdown.js";
import { resume } from "./resume.js";

export async function handoffCommand(branch: string | undefined): Promise<void> {
  const result = await resume(branch);
  if (!result) {
    console.log(`${pc.yellow("No snapshot")} for ${pc.cyan(branch ?? "this branch")}.`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(renderMarkdown(result.snapshot, result.base, { full: true }));
}

export async function launchClaude(snapshot: Snapshot, base?: BaseComparison): Promise<number> {
  const file = join(tmpdir(), `ctxr-handoff-${Date.now()}.md`);
  await writeFile(file, renderMarkdown(snapshot, base, { full: true }));
  const prompt = `Resume my work on branch ${snapshot.repo.branch}. Read ${file} first: it says what I was doing, the failing command, and the next step. Then continue with: ${snapshot.aiSummary.nextAction}`;
  return new Promise((resolve) => {
    const child = spawn("claude", [prompt], {
      cwd: snapshot.repo.path,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}
