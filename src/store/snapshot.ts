import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { branchDir, latestPath, reposDir } from "./paths.js";
import { scrubSecrets } from "./scrub.js";

export const snapshotVersion = "2.0";

export interface LoggedCommand {
  ts: string;
  cwd: string;
  cmd: string;
  exitCode: number;
}

export interface Summary {
  intent: string;
  lastError?: string;
  nextAction: string;
  provider: string;
}

export interface Snapshot {
  version: string;
  repoId: string;
  repo: { name: string; path: string; branch: string; commit: string };
  timestamp: string;
  note?: string;
  git: { modifiedFiles: string[]; diffStat: string; diffExcerpt?: string };
  terminal: {
    lastCommands: LoggedCommand[];
    lastCommand?: string;
    exitCode?: number;
    errorSnippet?: string;
  };
  aiSummary: Summary;
}

export interface WriteOptions {
  coalesceMs?: number;
}

export async function writeSnapshot(
  snapshot: Snapshot,
  options: WriteOptions = {},
): Promise<string> {
  const dir = branchDir(snapshot.repoId, snapshot.repo.branch);
  await mkdir(dir, { recursive: true });
  if (options.coalesceMs) await removeRecentSnapshotFile(snapshot, options.coalesceMs);
  const json = scrubSecrets(JSON.stringify(snapshot, null, 2));
  const file = join(dir, timestampFileName(snapshot.timestamp));
  await writeFile(file, json);
  await writeFile(latestPath(snapshot.repoId, snapshot.repo.branch), json);
  return file;
}

function timestampFileName(timestamp: string): string {
  return `${timestamp.replace(/[:.]/g, "-")}.json`;
}

async function removeRecentSnapshotFile(snapshot: Snapshot, coalesceMs: number): Promise<void> {
  const latest = await readLatest(snapshot.repoId, snapshot.repo.branch);
  if (!latest || latest.timestamp === snapshot.timestamp) return;
  const age = new Date(snapshot.timestamp).getTime() - new Date(latest.timestamp).getTime();
  if (age < 0 || age >= coalesceMs) return;
  const dir = branchDir(snapshot.repoId, snapshot.repo.branch);
  await rm(join(dir, timestampFileName(latest.timestamp)), { force: true });
}

export async function readLatest(repoId: string, branch: string): Promise<Snapshot | undefined> {
  return readSnapshotFile(latestPath(repoId, branch));
}

export async function listLatest(repoId?: string): Promise<Snapshot[]> {
  const root = reposDir();
  const repoIds = repoId ? [repoId] : await safeReaddir(root);
  const snapshots: Snapshot[] = [];
  for (const id of repoIds) {
    for (const slug of await safeReaddir(join(root, id))) {
      const snapshot = await readSnapshotFile(join(root, id, slug, "latest.json"));
      if (snapshot) snapshots.push(snapshot);
    }
  }
  return snapshots.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

async function readSnapshotFile(file: string): Promise<Snapshot | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as Snapshot;
  } catch {
    return undefined;
  }
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

export async function updateLatest(snapshot: Snapshot): Promise<void> {
  await writeSnapshot(snapshot);
}
