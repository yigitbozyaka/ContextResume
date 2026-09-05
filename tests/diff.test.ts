import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { diffCommand } from "../src/commands/diff.js";
import { pause } from "../src/commands/pause.js";
import { createRepo, runGit, type TestRepo } from "./helpers/repo.js";

const ansiPattern = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*",
    "(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)",
    "|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  ].join(""),
  "g",
);

function stripAnsi(text: string): string {
  return text.replace(ansiPattern, "");
}

let ctxrHome: string;
let repo: TestRepo;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  ctxrHome = await mkdtemp(join(tmpdir(), "ctxr-home-"));
  process.env.CTXR_HOME = ctxrHome;
  repo = await createRepo();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  logSpy.mockRestore();
  process.exitCode = 0;
  delete process.env.CTXR_HOME;
  await repo.cleanup();
  try {
    await rm(ctxrHome, { recursive: true, force: true });
  } catch {}
});

function output(): string {
  return stripAnsi(logSpy.mock.calls.map((call: unknown[]) => call.join(" ")).join("\n"));
}

describe("diffCommand", () => {
  it("reports no new commits and a matching working tree right after pause", async () => {
    await pause("note", { ai: false }, repo.dir);

    await diffCommand(undefined, repo.dir);

    const text = output();
    expect(text).toContain("No new commits");
    expect(text).toContain("Working tree matches the snapshot commit");
  });

  it("reports new commits with the commit subject after committing", async () => {
    await pause("note", { ai: false }, repo.dir);
    await writeFile(join(repo.dir, "new-file.txt"), "hello\n");
    runGit(["add", "new-file.txt"], repo.dir);
    runGit(["commit", "-m", "Add new file"], repo.dir);

    await diffCommand(undefined, repo.dir);

    const text = output();
    expect(text).toContain("New commits");
    expect(text).toContain("Add new file");
  });

  it("reports the working tree diff for an uncommitted modification", async () => {
    await writeFile(join(repo.dir, "tracked.txt"), "original\n");
    runGit(["add", "tracked.txt"], repo.dir);
    runGit(["commit", "-m", "Add tracked file"], repo.dir);
    await pause("note", { ai: false }, repo.dir);
    await writeFile(join(repo.dir, "tracked.txt"), "changed\n");

    await diffCommand(undefined, repo.dir);

    const text = output();
    expect(text).toContain("Working tree vs snapshot commit");
    expect(text).toContain("tracked.txt");
  });

  it("reports no snapshot and sets a nonzero exit code for a branch with none", async () => {
    await diffCommand(undefined, repo.dir);

    const text = output();
    expect(text).toContain("No snapshot");
    expect(process.exitCode).toBe(1);
  });
});
