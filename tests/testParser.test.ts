import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractFailure, formatFailure } from "../src/sensors/testParser.js";

function loadFixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8");
}

describe("extractFailure", () => {
  it("parses a jest failure", () => {
    const failure = extractFailure(loadFixture("jest-fail.txt"));
    expect(failure).toEqual({
      file: "tests/auth.test.ts",
      line: 42,
      message: "TokenExpiredError: jwt expired",
    });
  });

  it("uses the expect(...) line as the message for jest matcher blocks", () => {
    const output = [
      "FAIL tests/math.test.ts",
      "  Math",
      "    ✕ adds numbers (2 ms)",
      "",
      "  ● Math › adds numbers",
      "",
      "    expect(received).toBe(expected) // Object.is equality",
      "",
      "    Expected: 200",
      "    Received: 401",
      "",
      "      at Object.<anonymous> (tests/math.test.ts:10:20)",
      "",
      "Tests:       1 failed, 1 total",
    ].join("\n");

    expect(extractFailure(output)).toEqual({
      file: "tests/math.test.ts",
      line: 10,
      message: "expect(received).toBe(expected) // Object.is equality",
    });
  });

  it("parses a jest failure without a bullet line, ignoring pnpm noise", () => {
    const failure = extractFailure(loadFixture("jest-plain-fail.txt"));
    expect(failure).toEqual({
      file: "tests/auth.test.ts",
      line: 42,
      message: "TokenExpiredError: jwt expired",
    });
  });

  it("returns undefined for pnpm lifecycle noise alone", () => {
    const output = [
      " ELIFECYCLE  Test failed. See above for more details.",
      " WARN   Local package.json exists, but node_modules missing, did you mean to install?",
    ].join("\n");

    expect(extractFailure(output)).toBeUndefined();
  });

  it("parses a vitest failure", () => {
    const failure = extractFailure(loadFixture("vitest-fail.txt"));
    expect(failure).toEqual({
      file: "tests/auth.test.ts",
      line: 42,
      message: "AssertionError: expected 401 to be 200",
    });
  });

  it("returns undefined for a passing vitest run", () => {
    expect(extractFailure(loadFixture("vitest-pass.txt"))).toBeUndefined();
  });

  it("parses a pytest failure using summary and traceback lines", () => {
    const failure = extractFailure(loadFixture("pytest-fail.txt"));
    expect(failure).toEqual({
      file: "tests/test_auth.py",
      line: 42,
      message: "AssertionError: assert 401 == 200",
    });
  });

  it("parses a pytest failure from the traceback form alone", () => {
    const output = [
      "    def test_refresh():",
      ">       assert response.status_code == 200",
      "E       assert 401 == 200",
      "",
      "tests/test_auth.py:42: AssertionError",
    ].join("\n");

    expect(extractFailure(output)).toEqual({
      file: "tests/test_auth.py",
      line: 42,
      message: "AssertionError: assert 401 == 200",
    });
  });

  it("parses a go test failure", () => {
    const failure = extractFailure(loadFixture("gotest-fail.txt"));
    expect(failure).toEqual({
      file: "auth_test.go",
      line: 42,
      message: "expected 200, got 401",
    });
  });

  it("parses a cargo test failure in the new panic format", () => {
    const failure = extractFailure(loadFixture("cargo-fail.txt"));
    expect(failure).toEqual({
      file: "src/auth.rs",
      line: 42,
      message: "assertion `left == right` failed",
    });
  });

  it("parses a cargo test failure in the old panic format", () => {
    const output =
      "thread 'tests::refresh' panicked at 'assertion failed: some message', src/auth.rs:42:9";

    expect(extractFailure(output)).toEqual({
      file: "src/auth.rs",
      line: 42,
      message: "assertion failed: some message",
    });
  });

  it("parses a generic error with an inline path:line token", () => {
    const failure = extractFailure(loadFixture("generic-error.txt"));
    expect(failure).toEqual({
      file: "src/utils/helper.js",
      line: 15,
      message:
        "Uncaught Error: cannot read properties of undefined (reading 'foo') at src/utils/helper.js:15:9",
    });
  });

  it("ignores summary lines and returns undefined when nothing recognizable is present", () => {
    const output = [
      "Test Suites: 5 passed, 5 total",
      "Tests:       12 passed, 12 total",
      "Done in 3.4s",
    ].join("\n");

    expect(extractFailure(output)).toBeUndefined();
  });

  it("skips node_modules frames in favor of the project frame", () => {
    const output = [
      "FAIL tests/auth.test.ts",
      "  ● Auth › refreshes expired token",
      "",
      "    TokenExpiredError: jwt expired",
      "",
      "      at Object.<anonymous> (node_modules/some-lib/index.js:10:5)",
      "      at Object.<anonymous> (tests/auth.test.ts:42:15)",
    ].join("\n");

    expect(extractFailure(output)).toEqual({
      file: "tests/auth.test.ts",
      line: 42,
      message: "TokenExpiredError: jwt expired",
    });
  });

  it("strips ANSI escape codes before matching", () => {
    const output = [
      "[1m[31mFAIL[39m[22m tests/auth.test.ts",
      "  [31m●[39m Auth › refreshes expired token",
      "",
      "    [31mTokenExpiredError: jwt expired[39m",
      "",
      "      at Object.<anonymous> (tests/auth.test.ts:42:15)",
    ].join("\n");

    expect(extractFailure(output)).toEqual({
      file: "tests/auth.test.ts",
      line: 42,
      message: "TokenExpiredError: jwt expired",
    });
  });

  it("handles Windows-style CRLF line endings and backslash paths", () => {
    const output = [
      "FAIL tests\\auth.test.ts",
      "  ● Auth › refreshes expired token",
      "",
      "    TokenExpiredError: jwt expired",
      "",
      "      at Object.<anonymous> (tests\\auth.test.ts:42:15)",
    ].join("\r\n");

    expect(extractFailure(output)).toEqual({
      file: "tests\\auth.test.ts",
      line: 42,
      message: "TokenExpiredError: jwt expired",
    });
  });

  it("returns undefined for output with nothing recognizable", () => {
    expect(extractFailure("Build complete.\nAll good here.\n")).toBeUndefined();
  });
});

describe("formatFailure", () => {
  it("formats file and line", () => {
    expect(formatFailure({ file: "tests/auth.test.ts", line: 42, message: "jwt expired" })).toBe(
      "jwt expired (tests/auth.test.ts:42)",
    );
  });

  it("formats file without a line", () => {
    expect(formatFailure({ file: "tests/auth.test.ts", message: "jwt expired" })).toBe(
      "jwt expired (tests/auth.test.ts)",
    );
  });

  it("formats a bare message", () => {
    expect(formatFailure({ message: "jwt expired" })).toBe("jwt expired");
  });
});
