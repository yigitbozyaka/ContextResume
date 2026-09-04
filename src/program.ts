import { createRequire } from "node:module";
import { Command } from "commander";
import { listCommand } from "./commands/list.js";
import { pauseCommand } from "./commands/pause.js";
import { resumeCommand } from "./commands/resume.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export function buildProgram(): Command {
  const program = new Command("ctxr")
    .description("Freeze and restore your developer context when switching branches.")
    .version(version);

  program
    .command("pause")
    .alias("p")
    .argument("[note]", "short note about what you were doing")
    .description("Save the current branch's context")
    .action(pauseCommand);

  program
    .command("resume")
    .alias("r")
    .argument("[branch]", "branch to resume (defaults to the current one)")
    .option("--json", "print the snapshot as JSON instead of the card")
    .description("Show the resume card for a branch")
    .action(resumeCommand);

  program
    .command("list")
    .alias("l")
    .option("-a, --all", "include every repository, not only the current one")
    .description("List saved snapshots")
    .action(listCommand);

  return program;
}
