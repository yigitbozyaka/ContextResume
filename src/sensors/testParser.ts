export interface Failure {
  file?: string;
  line?: number;
  message: string;
}

const ANSI_PATTERN = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  ].join("|"),
  "g",
);

const SKIPPED_PATH_SEGMENTS = [
  "node_modules",
  "node:internal",
  "site-packages",
  "/rustc/",
  "/usr/lib/go",
  "runtime/",
];

const PACKAGE_MANAGER_NOISE_PREFIXES = [
  "ELIFECYCLE",
  "WARN",
  "ERR_PNPM",
  "npm ERR!",
  "npm error",
  "yarn run",
  "error Command failed",
  "Command failed with exit code",
  "See above for more details",
];

function stripAnsi(input: string): string {
  return input.replace(ANSI_PATTERN, "");
}

function isSkippedPath(candidate: string): boolean {
  return SKIPPED_PATH_SEGMENTS.some((segment) => candidate.includes(segment));
}

function isPackageManagerNoise(trimmed: string): boolean {
  return PACKAGE_MANAGER_NOISE_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function buildFailure(message: string, file?: string, line?: number): Failure {
  if (file === undefined) return { message };
  if (line === undefined) return { file, message };
  return { file, line, message };
}

function matchPytest(lines: string[]): Failure | undefined {
  const failedLine = lines.find((entry) => /^FAILED\s+\S+/.test(entry.trim()));
  const tracebackIndex = lines.findIndex((entry) => /^\S+\.py:\d+:\s*\S+/.test(entry.trim()));

  if (failedLine === undefined && tracebackIndex === -1) return undefined;

  let file: string | undefined;
  let line: number | undefined;
  let exceptionFromTraceback: string | undefined;

  if (tracebackIndex !== -1) {
    const tracebackLine = lines[tracebackIndex];
    if (tracebackLine !== undefined) {
      const match = tracebackLine.trim().match(/^(\S+\.py):(\d+):\s*(\S+)/);
      if (match !== null) {
        const [, matchedFile, matchedLine, exceptionName] = match;
        if (matchedFile !== undefined && !isSkippedPath(matchedFile)) {
          file = matchedFile;
          line = matchedLine !== undefined ? Number(matchedLine) : undefined;
        }
        exceptionFromTraceback = exceptionName;
      }
    }
  }

  let message: string | undefined;

  if (failedLine !== undefined) {
    const match = failedLine.trim().match(/^FAILED\s+(\S+?)(?:::\S+)?\s+-\s+(.+)$/);
    if (match !== null) {
      const [, summaryFile, summaryMessage] = match;
      if (file === undefined && summaryFile !== undefined && !isSkippedPath(summaryFile)) {
        file = summaryFile;
      }
      message = summaryMessage?.trim();
    }
  }

  if (message === undefined && tracebackIndex !== -1) {
    const eLine = lines
      .slice(0, tracebackIndex)
      .reverse()
      .find((entry) => /^\s*E\s+/.test(entry));
    if (eLine !== undefined) {
      const content = eLine.replace(/^\s*E\s+/, "").trim();
      message =
        exceptionFromTraceback !== undefined ? `${exceptionFromTraceback}: ${content}` : content;
    } else if (exceptionFromTraceback !== undefined) {
      message = exceptionFromTraceback;
    }
  }

  if (message === undefined) return undefined;
  return buildFailure(message, file, line);
}

function matchGoTest(lines: string[]): Failure | undefined {
  const failIndex = lines.findIndex((entry) => /^---\s*FAIL:\s+/.test(entry.trim()));
  if (failIndex === -1) return undefined;

  for (let i = failIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const match = raw.trim().match(/^(\S+\.go):(\d+):\s*(.+)$/);
    if (match === null) continue;
    const [, file, lineNumber, message] = match;
    if (file === undefined || lineNumber === undefined || message === undefined) continue;
    if (isSkippedPath(file)) continue;
    return buildFailure(message.trim(), file, Number(lineNumber));
  }
  return undefined;
}

function matchCargo(lines: string[]): Failure | undefined {
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    if (!/panicked at/.test(raw)) continue;

    const oldFormat = raw.match(/panicked at '([\s\S]+?)',\s*(\S+):(\d+):(\d+)/);
    if (oldFormat !== null) {
      const [, message, file, lineNumber] = oldFormat;
      if (message !== undefined && file !== undefined && lineNumber !== undefined) {
        return buildFailure(message.trim(), file, Number(lineNumber));
      }
    }

    const newFormat = raw.match(/panicked at (\S+):(\d+):(\d+):\s*$/);
    if (newFormat !== null) {
      const [, file, lineNumber] = newFormat;
      if (file !== undefined && lineNumber !== undefined) {
        const messageLine = lines.slice(i + 1).find((entry) => entry.trim().length > 0);
        const message = messageLine !== undefined ? messageLine.trim() : "panicked";
        return buildFailure(message, file, Number(lineNumber));
      }
    }
  }
  return undefined;
}

const JEST_ERROR_MESSAGE_PATTERN = /^[A-Za-z_$][\w$.]*(?:Error|Exception)\b.*/;

function isJestMessageLine(trimmed: string): boolean {
  return JEST_ERROR_MESSAGE_PATTERN.test(trimmed) || trimmed.startsWith("expect(");
}

function matchJestStackFrame(trimmed: string): { file: string; line: number } | undefined {
  const match = trimmed.match(/^at\s+(?:.*\()?([^()\s]+):(\d+):(\d+)\)?$/);
  if (match === null) return undefined;
  const [, file, lineNumber] = match;
  if (file === undefined || lineNumber === undefined) return undefined;
  if (isSkippedPath(file)) return undefined;
  return { file, line: Number(lineNumber) };
}

function matchJest(lines: string[]): Failure | undefined {
  const failIndex = lines.findIndex((entry) => /^\s*FAIL\s+\S+/.test(entry));
  if (failIndex === -1) return undefined;

  let message: string | undefined;
  for (let i = failIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (isJestMessageLine(trimmed)) {
      message = trimmed;
      break;
    }
  }

  if (message === undefined) return undefined;

  let file: string | undefined;
  let line: number | undefined;
  for (let i = failIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const frame = matchJestStackFrame(raw.trim());
    if (frame === undefined) continue;
    file = frame.file;
    line = frame.line;
    break;
  }

  if (file === undefined || line === undefined) return undefined;
  return buildFailure(message, file, line);
}

function matchVitest(lines: string[]): Failure | undefined {
  const hasFailLine = lines.some((entry) => /^\s*FAIL\s+\S+.*>/.test(entry));

  const arrowMatches: Array<{ file: string; line: number }> = [];
  for (const raw of lines) {
    const match = raw.match(/^\s*❯\s*(\S+):(\d+):(\d+)/);
    if (match === null) continue;
    const [, file, lineNumber] = match;
    if (file === undefined || lineNumber === undefined) continue;
    arrowMatches.push({ file, line: Number(lineNumber) });
  }

  if (!hasFailLine && arrowMatches.length === 0) return undefined;

  const preferred = arrowMatches.find((entry) => !isSkippedPath(entry.file));
  const chosen = preferred ?? arrowMatches[0];

  const errorLine = lines.find((entry) => /^\s*[\w.]+Error:\s*.+/.test(entry.trim()));
  if (errorLine === undefined) return undefined;

  const message = errorLine.trim();
  return chosen !== undefined
    ? buildFailure(message, chosen.file, chosen.line)
    : buildFailure(message);
}

function isSummaryNoise(line: string): boolean {
  if (/^(Tests:|Test Suites:|Test Files)\b/i.test(line)) return true;
  if (/\d+\s+(passed|failed|skipped|total)\b/i.test(line)) return true;
  return false;
}

function matchGeneric(lines: string[]): Failure | undefined {
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (!/\b(error|exception|panic|failed)\b/i.test(trimmed)) continue;
    if (isSummaryNoise(trimmed)) continue;
    if (isPackageManagerNoise(trimmed)) continue;

    const pathMatch = trimmed.match(/([^\s():]+):(\d+)(?::\d+)?/);
    if (pathMatch !== null) {
      const [, file, lineNumber] = pathMatch;
      if (file !== undefined && lineNumber !== undefined && !isSkippedPath(file)) {
        return buildFailure(trimmed, file, Number(lineNumber));
      }
    }
    return buildFailure(trimmed);
  }
  return undefined;
}

const MATCHERS = [matchPytest, matchGoTest, matchCargo, matchJest, matchVitest, matchGeneric];

export function extractFailure(output: string): Failure | undefined {
  const cleaned = stripAnsi(output);
  const lines = cleaned.split(/\r\n|\r|\n/);

  for (const matcher of MATCHERS) {
    const result = matcher(lines);
    if (result !== undefined) return result;
  }
  return undefined;
}

export function formatFailure(failure: Failure): string {
  if (!failure.file) return failure.message;
  const location = failure.line ? `${failure.file}:${failure.line}` : failure.file;
  return `${failure.message} (${location})`;
}
