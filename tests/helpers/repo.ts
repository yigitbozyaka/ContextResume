import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TestRepo {
  dir: string;
  cleanup(): Promise<void>;
}

export async function createRepo(): Promise<TestRepo> {
  const dir = await mkdtemp(join(tmpdir(), "ctxr-repo-"));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "test"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: dir });
  return {
    dir,
    async cleanup() {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch {}
    },
  };
}

export function runGit(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}
