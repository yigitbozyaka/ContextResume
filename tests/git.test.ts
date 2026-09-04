import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  changedFiles,
  collectRepoState,
  compareWithBase,
  currentBranch,
  detectBaseBranch,
  isInsideRepo,
  repoId,
} from "../src/sensors/git.js";
import { createRepo, runGit, type TestRepo } from "./helpers/repo.js";

let repo: TestRepo;

beforeEach(async () => {
  repo = await createRepo();
});

afterEach(async () => {
  await repo.cleanup();
});

describe("isInsideRepo", () => {
  it("is true inside a git repository", async () => {
    await expect(isInsideRepo(repo.dir)).resolves.toBe(true);
  });

  it("is false in a plain temp directory", async () => {
    const plain = await mkdtemp(join(tmpdir(), "ctxr-plain-"));
    await expect(isInsideRepo(plain)).resolves.toBe(false);
    try {
      await rm(plain, { recursive: true, force: true });
    } catch {}
  });
});

describe("repoId", () => {
  it("equals the root commit hash", async () => {
    const expected = runGit(["rev-list", "--max-parents=0", "HEAD"], repo.dir);
    await expect(repoId(repo.dir)).resolves.toBe(expected);
  });
});

describe("currentBranch", () => {
  it("is main on a fresh repo", async () => {
    await expect(currentBranch(repo.dir)).resolves.toBe("main");
  });
});

describe("changedFiles", () => {
  it("lists a modified tracked file and a full path for an untracked file", async () => {
    writeFileSync(join(repo.dir, "tracked.txt"), "one\n");
    runGit(["add", "tracked.txt"], repo.dir);
    runGit(["commit", "-m", "add tracked"], repo.dir);
    writeFileSync(join(repo.dir, "tracked.txt"), "two\n");
    mkdirSync(join(repo.dir, "src"), { recursive: true });
    writeFileSync(join(repo.dir, "src", "new.ts"), "export {};\n");

    const files = await changedFiles(repo.dir);
    expect(files).toContain("tracked.txt");
    expect(files).toContain("src/new.ts");
  });
});

describe("collectRepoState", () => {
  it("reports the repo name and a clean tree", async () => {
    const state = await collectRepoState(repo.dir);
    expect(state.name).toBe(basename(repo.dir));
    expect(state.diffStat).toBe("clean");
  });

  it("reports a diff stat after modifying a committed file", async () => {
    writeFileSync(join(repo.dir, "tracked.txt"), "one\n");
    runGit(["add", "tracked.txt"], repo.dir);
    runGit(["commit", "-m", "add tracked"], repo.dir);
    writeFileSync(join(repo.dir, "tracked.txt"), "two\n");

    const state = await collectRepoState(repo.dir);
    expect(state.diffStat).toContain("1 file changed");
  });
});

describe("detectBaseBranch", () => {
  it("finds main from a feature branch", async () => {
    runGit(["checkout", "-q", "-b", "feature"], repo.dir);
    await expect(detectBaseBranch(repo.dir, "feature")).resolves.toBe("main");
  });

  it("returns undefined when already on main with no other candidate", async () => {
    await expect(detectBaseBranch(repo.dir, "main")).resolves.toBeUndefined();
  });
});

describe("compareWithBase", () => {
  async function buildDivergedRepo(): Promise<TestRepo> {
    const state = await createRepo();
    writeFileSync(join(state.dir, "a.ts"), "a1\n");
    writeFileSync(join(state.dir, "b.ts"), "b1\n");
    runGit(["add", "a.ts", "b.ts"], state.dir);
    runGit(["commit", "-m", "add a and b"], state.dir);

    runGit(["checkout", "-q", "-b", "feature"], state.dir);
    writeFileSync(join(state.dir, "a.ts"), "a2-feature\n");
    runGit(["add", "a.ts"], state.dir);
    runGit(["commit", "-m", "edit a on feature"], state.dir);

    runGit(["checkout", "-q", "main"], state.dir);
    writeFileSync(join(state.dir, "a.ts"), "a2-main\n");
    writeFileSync(join(state.dir, "c.ts"), "c1\n");
    runGit(["add", "a.ts", "c.ts"], state.dir);
    runGit(["commit", "-m", "edit a and add c on main"], state.dir);

    runGit(["checkout", "-q", "feature"], state.dir);
    return state;
  }

  it("reports ahead/behind counts and committed overlapping files", async () => {
    const diverged = await buildDivergedRepo();
    const comparison = await compareWithBase(diverged.dir, "main", []);
    expect(comparison.behindBy).toBe(1);
    expect(comparison.aheadBy).toBe(1);
    expect(comparison.overlappingFiles).toEqual(["a.ts"]);
    await diverged.cleanup();
  });

  it("includes an uncommitted touched file in the overlap", async () => {
    const diverged = await buildDivergedRepo();
    const comparison = await compareWithBase(diverged.dir, "main", ["c.ts"]);
    expect(comparison.overlappingFiles).toContain("c.ts");
    await diverged.cleanup();
  });
});
