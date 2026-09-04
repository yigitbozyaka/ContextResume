import pc from "picocolors";
import { summarize } from "../brain/heuristic.js";
import { collectRepoState, isInsideRepo } from "../sensors/git.js";
import { type Snapshot, snapshotVersion, writeSnapshot } from "../store/snapshot.js";

export async function pause(note: string | undefined, cwd = process.cwd()): Promise<Snapshot> {
  if (!(await isInsideRepo(cwd))) throw new Error("Not inside a git repository.");
  const state = await collectRepoState(cwd);
  const git = { modifiedFiles: state.modifiedFiles, diffStat: state.diffStat };
  const terminal = { lastCommands: [] };
  const snapshot: Snapshot = {
    version: snapshotVersion,
    repoId: state.repoId,
    repo: { name: state.name, path: state.path, branch: state.branch, commit: state.commit },
    timestamp: new Date().toISOString(),
    ...(note ? { note } : {}),
    git,
    terminal,
    aiSummary: summarize({ note, git, terminal }),
  };
  await writeSnapshot(snapshot);
  return snapshot;
}

export async function pauseCommand(note: string | undefined): Promise<void> {
  const snapshot = await pause(note);
  const count = snapshot.git.modifiedFiles.length;
  console.log(
    `${pc.green("Saved")} context for ${pc.cyan(snapshot.repo.branch)} (${count} changed file${count === 1 ? "" : "s"}).`,
  );
}
