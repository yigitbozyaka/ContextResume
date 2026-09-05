import pc from "picocolors";
import { currentBranch, git, isInsideRepo, repoId } from "../sensors/git.js";
import { readLatest } from "../store/snapshot.js";
import { relativeTime } from "../ui/card.js";

export async function diffCommand(branch: string | undefined, cwd = process.cwd()): Promise<void> {
  if (!(await isInsideRepo(cwd))) throw new Error("Not inside a git repository.");
  const target = branch ?? (await currentBranch(cwd));
  const snapshot = await readLatest(await repoId(cwd), target);
  if (!snapshot) {
    console.log(`${pc.yellow("No snapshot")} for ${pc.cyan(target)}.`);
    process.exitCode = 1;
    return;
  }
  console.log(
    pc.dim(
      `Since the snapshot of ${target} taken ${relativeTime(snapshot.timestamp)} at ${snapshot.repo.commit}:`,
    ),
  );
  const commits = await git(["log", "--oneline", `${snapshot.repo.commit}..HEAD`], cwd);
  console.log(
    commits ? `\n${pc.bold("New commits")}\n${commits}` : `\n${pc.bold("No new commits")}`,
  );
  const stat = await git(["diff", "--stat", snapshot.repo.commit], cwd);
  console.log(
    stat
      ? `\n${pc.bold("Working tree vs snapshot commit")}\n${stat}`
      : `\n${pc.bold("Working tree matches the snapshot commit")}`,
  );
}
