import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { LoggedCommand } from "../store/snapshot.js";
import { git } from "./git.js";
import { extractFailure, formatFailure } from "./testParser.js";

export interface LogEntry extends LoggedCommand {
  branch: string;
  output?: string;
}

export const outputTailLines = 40;
export const logFileName = "ctxr-log.tsv";

export async function logPath(cwd: string): Promise<string> {
  const commonDir = await git(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd);
  return join(commonDir, logFileName);
}

export function formatLogLine(entry: LogEntry): string {
  const fields = [
    entry.ts,
    entry.cwd,
    entry.branch,
    String(entry.exitCode),
    entry.cmd.replace(/[\t\r\n]+/g, " "),
  ];
  if (entry.output !== undefined) fields.push(JSON.stringify(entry.output));
  return `${fields.join("\t")}\n`;
}

export function parseLogLine(line: string): LogEntry | undefined {
  const [ts, cwd, branch, code, cmd, output] = line.replace(/\r$/, "").split("\t");
  if (!ts || !cwd || branch === undefined || code === undefined || cmd === undefined)
    return undefined;
  const exitCode = Number(code);
  if (!Number.isInteger(exitCode)) return undefined;
  const entry: LogEntry = { ts, cwd, branch, cmd, exitCode };
  if (output?.startsWith('"')) {
    try {
      entry.output = JSON.parse(output) as string;
    } catch {}
  }
  return entry;
}

export async function appendLogEntry(cwd: string, entry: LogEntry): Promise<void> {
  await appendFile(await logPath(cwd), formatLogLine(entry));
}

export async function readLog(cwd: string): Promise<LogEntry[]> {
  let text: string;
  try {
    text = await readFile(await logPath(cwd), "utf8");
  } catch {
    return [];
  }
  return text
    .replace(/^﻿/, "")
    .split("\n")
    .map(parseLogLine)
    .filter((e): e is LogEntry => e !== undefined);
}

export interface TerminalState {
  lastCommands: LoggedCommand[];
  lastCommand?: string;
  exitCode?: number;
  errorSnippet?: string;
}

const ignoredCommand =
  /^(ctxr|cd|ls|dir|clear|cls|exit|pwd|git (status|log|diff|branch|switch|checkout))\b/;

export function summarizeEntries(entries: LogEntry[], branch: string): TerminalState {
  const relevant = entries
    .filter((e) => e.branch === branch && !ignoredCommand.test(e.cmd))
    .slice(-20);
  const lastCommands = relevant
    .slice(-5)
    .map(({ ts, cwd, cmd, exitCode }) => ({ ts, cwd, cmd, exitCode }));
  const failing = lastUnresolvedFailure(relevant);
  if (!failing) return { lastCommands };
  const state: TerminalState = {
    lastCommands,
    lastCommand: failing.cmd,
    exitCode: failing.exitCode,
  };
  const failure = failing.output ? extractFailure(failing.output) : undefined;
  if (failure) state.errorSnippet = formatFailure(failure);
  return state;
}

function lastUnresolvedFailure(entries: LogEntry[]): LogEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as LogEntry;
    if (entry.exitCode === 0) continue;
    const fixedLater = entries.slice(i + 1).some((e) => e.cmd === entry.cmd && e.exitCode === 0);
    if (!fixedLater) return entry;
  }
  return undefined;
}

export async function collectTerminalState(cwd: string, branch: string): Promise<TerminalState> {
  return summarizeEntries(await readLog(cwd), branch);
}
