import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 16 * 1024 * 1024 });
  return stdout.trimEnd();
}

async function gitOrUndefined(args: string[], cwd: string): Promise<string | undefined> {
  try {
    return await git(args, cwd);
  } catch {
    return undefined;
  }
}

export interface RepoState {
  repoId: string;
  name: string;
  path: string;
  branch: string;
  commit: string;
  modifiedFiles: string[];
  diffStat: string;
}

export async function isInsideRepo(cwd: string): Promise<boolean> {
  return (await gitOrUndefined(["rev-parse", "--is-inside-work-tree"], cwd)) === "true";
}

export async function repoId(cwd: string): Promise<string> {
  const roots = (await git(["rev-list", "--max-parents=0", "HEAD"], cwd)).split("\n").sort();
  const first = roots[0];
  if (!first) throw new Error("Repository has no commits yet.");
  return first;
}

export async function currentBranch(cwd: string): Promise<string> {
  return git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
}

export async function changedFiles(cwd: string): Promise<string[]> {
  const entries = (await git(["status", "--porcelain", "-z", "--untracked-files=all"], cwd))
    .split("\0")
    .filter(Boolean);
  const files: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] as string;
    files.push(entry.slice(3));
    if (entry.startsWith("R") || entry.startsWith("C")) i++;
  }
  return files;
}

export async function collectRepoState(cwd: string): Promise<RepoState> {
  const path = await git(["rev-parse", "--show-toplevel"], cwd);
  const [id, branch, commit, modifiedFiles, tracked] = await Promise.all([
    repoId(cwd),
    currentBranch(cwd),
    git(["rev-parse", "--short", "HEAD"], cwd),
    changedFiles(cwd),
    git(["diff", "--shortstat", "HEAD"], cwd),
  ]);
  return {
    repoId: id,
    name: basename(path),
    path,
    branch,
    commit,
    modifiedFiles,
    diffStat:
      tracked.trim() || (modifiedFiles.length ? `${modifiedFiles.length} untracked` : "clean"),
  };
}

export interface BaseComparison {
  branch: string;
  aheadBy: number;
  behindBy: number;
  overlappingFiles: string[];
}

export async function detectBaseBranch(cwd: string, current: string): Promise<string | undefined> {
  const remoteHead = await gitOrUndefined(
    ["symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"],
    cwd,
  );
  const candidates = [remoteHead, "main", "master", "develop"].filter(
    (c): c is string => !!c && c !== current && c.replace(/^origin\//, "") !== current,
  );
  for (const candidate of candidates) {
    if ((await gitOrUndefined(["rev-parse", "--verify", "-q", candidate], cwd)) !== undefined)
      return candidate;
  }
  return undefined;
}

export async function compareWithBase(
  cwd: string,
  base: string,
  touchedFiles: string[],
): Promise<BaseComparison> {
  const counts = await git(["rev-list", "--left-right", "--count", `${base}...HEAD`], cwd);
  const [behindBy = 0, aheadBy = 0] = counts.split(/\s+/).map(Number);
  const mergeBase = await git(["merge-base", base, "HEAD"], cwd);
  const changedOnBase = new Set(
    (await git(["diff", "--name-only", mergeBase, base], cwd)).split("\n"),
  );
  const committedOnBranch = (await git(["diff", "--name-only", `${base}...HEAD`], cwd)).split("\n");
  const touched = new Set([...touchedFiles, ...committedOnBranch].filter(Boolean));
  return {
    branch: base,
    aheadBy,
    behindBy,
    overlappingFiles: [...touched].filter((f) => changedOnBase.has(f)).sort(),
  };
}
