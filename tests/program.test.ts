import { createRequire } from "node:module";
import { expect, test } from "vitest";
import { buildProgram } from "../src/program.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

test("program exposes the package version", () => {
  expect(buildProgram().version()).toBe(version);
});
