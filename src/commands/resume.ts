import { isCancel, select } from "@clack/prompts";
import pc from "picocolors";
import {
  type BaseComparison,
  compareWithBase,
  currentBranch,
  detectBaseBranch,
  isInsideRepo,
  repoId,
} from "../sensors/git.js";
import { readLatest, type Snapshot } from "../store/snapshot.js";
import { renderCard } from "../ui/card.js";
import { runCommand } from "./run.js";

export interface ResumeResult {
  snapshot: Snapshot;
  base?: BaseComparison;
}

export interface ResumeOptions {
  json?: boolean | undefined;
  auto?: boolean | undefined;
}

export async function resume(
  branch: string | undefined,
  cwd = process.cwd(),
): Promise<ResumeResult | undefined> {
  if (!(await isInsideRepo(cwd))) throw new Error("Not inside a git repository.");
  const id = await repoId(cwd);
  const target = branch ?? (await currentBranch(cwd));
  const snapshot = await readLatest(id, target);
  if (!snapshot) return undefined;
  const baseBranch = await detectBaseBranch(cwd, target);
  let base: BaseComparison | undefined;
  if (baseBranch) {
    try {
      base = await compareWithBase(cwd, baseBranch, snapshot.git.modifiedFiles);
    } catch {
      base = undefined;
    }
  }
  return base ? { snapshot, base } : { snapshot };
}

export async function resumeCommand(
  branch: string | undefined,
  options: ResumeOptions,
): Promise<void> {
  const result = await resume(branch);
  if (!result) {
    if (options.auto) return;
    const name = branch ?? "this branch";
    console.log(
      `${pc.yellow("No snapshot")} for ${pc.cyan(name)}. Run ${pc.bold("ctxr pause")} before switching away.`,
    );
    process.exitCode = 1;
    return;
  }
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(renderCard(result.snapshot, result.base));
  const failing = result.snapshot.terminal.lastCommand;
  if (options.auto || !failing || !process.stdin.isTTY) return;
  const action = await select({
    message: "Next",
    options: [
      { value: "rerun", label: `Rerun ${failing}` },
      { value: "quit", label: "Quit" },
    ],
  });
  if (isCancel(action) || action === "quit") return;
  process.exitCode = await runCommand([failing]);
}
