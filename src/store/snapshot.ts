import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

export async function writeSnapshot(snapshot: Snapshot): Promise<string> {
  const dir = branchDir(snapshot.repoId, snapshot.repo.branch);
  await mkdir(dir, { recursive: true });
  const json = scrubSecrets(JSON.stringify(snapshot, null, 2));
  const file = join(dir, `${snapshot.timestamp.replace(/[:.]/g, "-")}.json`);
  await writeFile(file, json);
  await writeFile(latestPath(snapshot.repoId, snapshot.repo.branch), json);
  return file;
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
