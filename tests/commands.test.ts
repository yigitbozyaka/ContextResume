import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pause } from "../src/commands/pause.js";
import { resume } from "../src/commands/resume.js";
import { createRepo, type TestRepo } from "./helpers/repo.js";

let ctxrHome: string;
let repo: TestRepo;

beforeEach(async () => {
  ctxrHome = await mkdtemp(join(tmpdir(), "ctxr-home-"));
  process.env.CTXR_HOME = ctxrHome;
  repo = await createRepo();
});

afterEach(async () => {
  delete process.env.CTXR_HOME;
  await repo.cleanup();
  try {
    await rm(ctxrHome, { recursive: true, force: true });
  } catch {}
});

describe("pause", () => {
  it("writes a snapshot for the current branch with the given note", async () => {
    const snapshot = await pause("note", {}, repo.dir);
    expect(snapshot.repo.branch).toBe("main");
    expect(snapshot.note).toBe("note");
  });

  it("rejects when run outside a git repository", async () => {
    const plain = await mkdtemp(join(tmpdir(), "ctxr-plain-"));
    await expect(pause("note", {}, plain)).rejects.toThrow("Not inside a git repository.");
    try {
      await rm(plain, { recursive: true, force: true });
    } catch {}
  });
});

describe("resume", () => {
  it("returns the snapshot for the current branch", async () => {
    const saved = await pause("note", {}, repo.dir);
    const result = await resume(undefined, repo.dir);
    expect(result?.snapshot).toEqual(saved);
  });

  it("returns undefined for a branch with no snapshot", async () => {
    await pause("note", {}, repo.dir);
    const result = await resume("missing", repo.dir);
    expect(result).toBeUndefined();
  });
});
