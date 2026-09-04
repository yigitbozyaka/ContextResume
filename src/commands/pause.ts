import pc from "picocolors";
import { summarize } from "../brain/heuristic.js";
import { collectRepoState, git, isInsideRepo } from "../sensors/git.js";
import { collectTerminalState } from "../sensors/terminal.js";
import { readLatest, type Snapshot, snapshotVersion, writeSnapshot } from "../store/snapshot.js";

export interface PauseOptions {
  branch?: string | undefined;
  auto?: boolean | undefined;
}

const noteCarryOverMs = 60 * 60 * 1000;

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
  const git_ = { modifiedFiles: state.modifiedFiles, diffStat: state.diffStat };
  const terminal = await collectTerminalState(cwd, branch);
  const snapshot: Snapshot = {
    version: snapshotVersion,
    repoId: state.repoId,
    repo: { name: state.name, path: state.path, branch, commit },
    timestamp: new Date().toISOString(),
    ...(carriedNote ? { note: carriedNote } : {}),
    git: git_,
    terminal,
    aiSummary: summarize({ note: carriedNote, git: git_, terminal }),
  };
  await writeSnapshot(snapshot);
  return snapshot;
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
