import { homedir } from "node:os";
import { join } from "node:path";

export function homeDir(): string {
  return process.env.CTXR_HOME ?? join(homedir(), ".context-resume");
}

export function reposDir(): string {
  return join(homeDir(), "repos");
}

export function branchSlug(branch: string): string {
  return branch.replace(/[^\w.-]+/g, "__");
}

export function branchDir(repoId: string, branch: string): string {
  return join(reposDir(), repoId, branchSlug(branch));
}

export function latestPath(repoId: string, branch: string): string {
  return join(branchDir(repoId, branch), "latest.json");
}
