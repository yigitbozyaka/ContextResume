import { basename, dirname } from "node:path";
import type { Snapshot, Summary } from "../store/snapshot.js";

type Input = Pick<Snapshot, "git" | "terminal"> & { note?: string | undefined };

const testFilePattern =
  /(^|[/\\])(tests?|__tests__|spec)([/\\]|$)|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py|rs)$|^test_.*\.py$/;

export function summarize({ note, git, terminal }: Input): Summary {
  const files = git.modifiedFiles;
  const testFiles = files.filter((f) => testFilePattern.test(f));
  const sourceFiles = files.filter((f) => !testFilePattern.test(f));
  const lastError = terminal.errorSnippet ?? failingCommandLine(terminal);

  const intent = note ?? describeFiles(files, sourceFiles, testFiles);

  let nextAction: string;
  if (terminal.lastCommand && terminal.exitCode) {
    nextAction = `Fix the failure and rerun: ${terminal.lastCommand}`;
  } else if (testFiles.length) {
    nextAction = `Run ${testFiles[0]} and make it pass.`;
  } else if (files.length) {
    nextAction = `Review the diff of ${files[0]} and continue from there.`;
  } else {
    nextAction = "Working tree was clean. Pick up from the last commit.";
  }

  return lastError
    ? { intent, lastError, nextAction, provider: "heuristic" }
    : { intent, nextAction, provider: "heuristic" };
}

function failingCommandLine(terminal: Input["terminal"]): string | undefined {
  if (!terminal.lastCommand || !terminal.exitCode) return undefined;
  return `${terminal.lastCommand} (exit code ${terminal.exitCode})`;
}

function describeFiles(files: string[], sourceFiles: string[], testFiles: string[]): string {
  if (!files.length) return "No uncommitted changes.";
  const areas = [...new Set(sourceFiles.map((f) => dirname(f)).filter((d) => d !== "."))];
  const area = areas.length === 1 ? ` in ${areas[0]}` : "";
  const names = files
    .slice(0, 4)
    .map((f) => basename(f))
    .join(", ");
  const more = files.length > 4 ? ` and ${files.length - 4} more` : "";
  const tests = testFiles.length
    ? ` with ${testFiles.length} test file${testFiles.length > 1 ? "s" : ""}`
    : "";
  return `Editing ${files.length} file${files.length > 1 ? "s" : ""}${area}${tests}: ${names}${more}.`;
}
