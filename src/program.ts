import { createRequire } from "node:module";
import { Command } from "commander";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export function buildProgram(): Command {
  return new Command("ctxr")
    .description("Freeze and restore your developer context when switching branches.")
    .version(version);
}
