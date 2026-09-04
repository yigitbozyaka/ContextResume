import { describe, expect, test } from "vitest";
import {
  formatLogLine,
  type LogEntry,
  parseLogLine,
  summarizeEntries,
} from "../src/sensors/terminal.js";

const entry = (cmd: string, exitCode: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  ts: "2026-09-04T20:40:11Z",
  cwd: "/repo",
  branch: "feature",
  cmd,
  exitCode,
  ...extra,
});

describe("log lines", () => {
  test("round-trips an entry without output", () => {
    const line = formatLogLine(entry("pnpm test", 1));
    expect(line).toBe("2026-09-04T20:40:11Z\t/repo\tfeature\t1\tpnpm test\n");
    expect(parseLogLine(line.trimEnd())).toEqual(entry("pnpm test", 1));
  });

  test("round-trips multi-line output as a sixth field", () => {
    const original = entry("pnpm test", 1, { output: "FAIL a.test.ts\n  expected 1\n" });
    const parsed = parseLogLine(formatLogLine(original).trimEnd());
    expect(parsed).toEqual(original);
  });

  test("tolerates shell-written lines with a trailing carriage return", () => {
    const parsed = parseLogLine("2026-09-04T20:40:11Z\t/repo\tmain\t0\tls -la\r");
    expect(parsed?.cmd).toBe("ls -la");
    expect(parsed?.exitCode).toBe(0);
  });

  test("rejects malformed lines", () => {
    expect(parseLogLine("garbage")).toBeUndefined();
    expect(parseLogLine("ts\tcwd\tbranch\tnotanumber\tcmd")).toBeUndefined();
  });
});

describe("summarizeEntries", () => {
  test("keeps only the requested branch and skips navigation commands", () => {
    const state = summarizeEntries(
      [
        entry("pnpm test", 1, { branch: "other" }),
        entry("cd src", 0),
        entry("git status", 0),
        entry("pnpm build", 0),
      ],
      "feature",
    );
    expect(state.lastCommands.map((c) => c.cmd)).toEqual(["pnpm build"]);
    expect(state.lastCommand).toBeUndefined();
  });

  test("reports the last failure that was not fixed later", () => {
    const state = summarizeEntries(
      [entry("pnpm test", 1), entry("pnpm lint", 1), entry("pnpm lint", 0)],
      "feature",
    );
    expect(state.lastCommand).toBe("pnpm test");
    expect(state.exitCode).toBe(1);
  });

  test("extracts an error snippet from captured output", () => {
    const output =
      "FAIL tests/auth.test.ts\n  ● refreshes token\n\n    TokenExpiredError: jwt expired\n\n      at Object.<anonymous> (tests/auth.test.ts:42:15)\n";
    const state = summarizeEntries([entry("pnpm test", 1, { output })], "feature");
    expect(state.errorSnippet).toContain("TokenExpiredError: jwt expired");
  });
});
