import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { branchDir, branchSlug, latestPath } from "../src/store/paths.js";
import { redacted } from "../src/store/scrub.js";
import { listLatest, readLatest, type Snapshot, writeSnapshot } from "../src/store/snapshot.js";

let ctxrHome: string;

beforeEach(async () => {
  ctxrHome = await mkdtemp(join(tmpdir(), "ctxr-store-"));
  process.env.CTXR_HOME = ctxrHome;
});

afterEach(async () => {
  delete process.env.CTXR_HOME;
  try {
    await rm(ctxrHome, { recursive: true, force: true });
  } catch {}
});

function buildSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    version: "2.0",
    repoId: "repo-a",
    repo: { name: "demo", path: "/repos/demo", branch: "main", commit: "abc1234" },
    timestamp: "2026-01-01T00:00:00.000Z",
    git: { modifiedFiles: [], diffStat: "clean" },
    terminal: { lastCommands: [] },
    aiSummary: { intent: "Working on demo.", nextAction: "Keep going.", provider: "heuristic" },
    ...overrides,
  };
}

describe("branchSlug", () => {
  it("replaces slashes with double underscores", () => {
    expect(branchSlug("feature/jwt-auth")).toBe("feature__jwt-auth");
  });
});

describe("writeSnapshot and readLatest", () => {
  it("round-trips a snapshot", async () => {
    const snapshot = buildSnapshot();
    await writeSnapshot(snapshot);
    const loaded = await readLatest(snapshot.repoId, snapshot.repo.branch);
    expect(loaded).toEqual(snapshot);
  });

  it("writes both the timestamped file and latest.json", async () => {
    const snapshot = buildSnapshot({ timestamp: "2026-02-03T04:05:06.789Z" });
    const file = await writeSnapshot(snapshot);
    const dir = branchDir(snapshot.repoId, snapshot.repo.branch);
    expect(file).toBe(join(dir, "2026-02-03T04-05-06-789Z.json"));
    await expect(readFile(file, "utf8")).resolves.toBeTruthy();
    await expect(
      readFile(latestPath(snapshot.repoId, snapshot.repo.branch), "utf8"),
    ).resolves.toBeTruthy();
  });

  it("scrubs secrets found in the snapshot before writing to disk", async () => {
    const secret = `ghp_${"b".repeat(36)}`;
    const snapshot = buildSnapshot({
      terminal: { lastCommands: [], errorSnippet: `remote: ${secret}` },
    });
    await writeSnapshot(snapshot);
    const raw = await readFile(latestPath(snapshot.repoId, snapshot.repo.branch), "utf8");
    expect(raw).not.toContain(secret);
    expect(raw).toContain(redacted);
    const loaded = await readLatest(snapshot.repoId, snapshot.repo.branch);
    expect(loaded?.terminal.errorSnippet).toBe(`remote: ${redacted}`);
  });

  it("returns undefined for a branch with no snapshot", async () => {
    await expect(readLatest("repo-a", "never-saved")).resolves.toBeUndefined();
  });
});

describe("listLatest", () => {
  it("returns snapshots sorted newest first across repos", async () => {
    const older = buildSnapshot({
      repoId: "repo-a",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    const newer = buildSnapshot({
      repoId: "repo-b",
      repo: { name: "other", path: "/repos/other", branch: "main", commit: "def5678" },
      timestamp: "2026-03-01T00:00:00.000Z",
    });
    await writeSnapshot(older);
    await writeSnapshot(newer);

    const all = await listLatest();
    expect(all.map((s) => s.repoId)).toEqual(["repo-b", "repo-a"]);
  });

  it("filters to a single repoId when given", async () => {
    const repoA = buildSnapshot({ repoId: "repo-a", timestamp: "2026-01-01T00:00:00.000Z" });
    const repoB = buildSnapshot({
      repoId: "repo-b",
      repo: { name: "other", path: "/repos/other", branch: "main", commit: "def5678" },
      timestamp: "2026-03-01T00:00:00.000Z",
    });
    await writeSnapshot(repoA);
    await writeSnapshot(repoB);

    const filtered = await listLatest("repo-a");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.repoId).toBe("repo-a");
  });
});
