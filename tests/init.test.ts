import { expect, test } from "vitest";
import { shellHook, supportedShells } from "../src/commands/init.js";

test("every supported shell has a hook that logs and switches", () => {
  for (const shell of supportedShells) {
    const hook = shellHook(shell);
    expect(hook).toContain("ctxr-log.tsv");
    expect(hook).toContain("ctxr pause --auto --branch");
    expect(hook).toContain("ctxr resume --auto");
    expect(hook).toContain("CTXR_NO_AUTO");
  }
});

test("unknown shells fail with the supported list", () => {
  expect(() => shellHook("fish")).toThrow("bash, zsh, pwsh");
});
