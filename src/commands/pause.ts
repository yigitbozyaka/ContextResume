import { spinner } from "@clack/prompts";
import pc from "picocolors";
import { summarize } from "../brain/heuristic.js";
import { summarizeWithBrains } from "../brain/index.js";
import { collectRepoState, diffExcerpt, git, isInsideRepo } from "../sensors/git.js";
import { collectTerminalState } from "../sensors/terminal.js";
import { readLatest, type Snapshot, snapshotVersion, writeSnapshot } from "../store/snapshot.js";

export interface PauseOptions {
  branch?: string | undefined;
  auto?: boolean | undefined;
  ai?: boolean | undefined;
}

const noteCarryOverMs = 60 * 60 * 1000;
const autoCoalesceMs = 15 * 60 * 1000;

export async function pause(
  note: string | undefined,
  options: PauseOptions = {},
  cwd = process.cwd(),
): Promise<Snapshot> {
  if (!(await isInsideRepo(cwd))) throw new Error("Not inside a git repository.");
  const state = await collectRepoState(cwd);
  const branch = options.branch ?? state.branch;
  const commit = options.branch ? await git(["rev-parse", "--short", branch], cwd) : state.commit;
  const carriedNote = note ?? (options.auto ? await recentNote(state.repoId, branch) : undefined);
  const excerpt = await diffExcerpt(cwd);
  const gitState: Snapshot["git"] = {
    modifiedFiles: state.modifiedFiles,
    diffStat: state.diffStat,
    ...(excerpt ? { diffExcerpt: excerpt } : {}),
  };
  const terminal = await collectTerminalState(cwd, branch);
  const input = { branch, note: carriedNote, git: gitState, terminal };
  const wantsAi = options.ai !== false && !options.auto;
  const aiSummary = wantsAi ? await summarizeWithSpinner(input) : summarize(input);
  const snapshot: Snapshot = {
    version: snapshotVersion,
    repoId: state.repoId,
    repo: { name: state.name, path: state.path, branch, commit },
    timestamp: new Date().toISOString(),
    ...(carriedNote ? { note: carriedNote } : {}),
    git: gitState,
    terminal,
    aiSummary,
  };
  await writeSnapshot(snapshot, options.auto ? { coalesceMs: autoCoalesceMs } : {});
  return snapshot;
}

export async function summarizeWithSpinner(
  input: Parameters<typeof summarize>[0] & { branch: string },
) {
  const progress = process.stderr.isTTY ? spinner({ output: process.stderr }) : undefined;
  progress?.start("Summarizing");
  const summary = await summarizeWithBrains(input, {
    onAttempt: (brain) => progress?.message(`Summarizing with ${brain}`),
  });
  progress?.stop(`Summary by ${summary.provider}`);
  return summary;
}

async function recentNote(repoId: string, branch: string): Promise<string | undefined> {
  const latest = await readLatest(repoId, branch);
  if (!latest?.note) return undefined;
  const age = Date.now() - new Date(latest.timestamp).getTime();
  return age < noteCarryOverMs ? latest.note : undefined;
}

export async function pauseCommand(note: string | undefined, options: PauseOptions): Promise<void> {
  const snapshot = await pause(note, options);
  if (options.auto) return;
  const count = snapshot.git.modifiedFiles.length;
  console.log(
    `${pc.green("Saved")} context for ${pc.cyan(snapshot.repo.branch)} (${count} changed file${count === 1 ? "" : "s"}).`,
  );
}
