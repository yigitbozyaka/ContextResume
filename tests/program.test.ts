import { expect, test } from "vitest";
import { buildProgram } from "../src/program.js";

test("program exposes the package version", () => {
  expect(buildProgram().version()).toBe("0.0.0");
});
