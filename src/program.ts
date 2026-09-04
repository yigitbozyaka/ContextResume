import { createRequire } from "node:module";
import { Command } from "commander";
import { initCommand, supportedShells } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { pauseCommand } from "./commands/pause.js";
import { resumeCommand } from "./commands/resume.js";
import { runCliCommand } from "./commands/run.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export function buildProgram(): Command {
  const program = new Command("ctxr")
    .description("Freeze and restore your developer context when switching branches.")
    .version(version)
    .enablePositionalOptions();

  program
    .command("pause")
    .alias("p")
    .argument("[note]", "short note about what you were doing")
    .option("--branch <name>", "record the snapshot for this branch instead of the current one")
    .option("--auto", "quiet mode used by the shell hook")
    .description("Save the current branch's context")
    .action(pauseCommand);

  program
    .command("resume")
    .alias("r")
    .argument("[branch]", "branch to resume (defaults to the current one)")
    .option("--json", "print the snapshot as JSON instead of the card")
    .option("--auto", "non-interactive mode used by the shell hook")
    .description("Show the resume card for a branch")
    .action(resumeCommand);

  program
    .command("list")
    .alias("l")
    .option("-a, --all", "include every repository, not only the current one")
    .description("List saved snapshots")
    .action(listCommand);

  program
    .command("run")
    .argument("<command...>", "command to run")
    .passThroughOptions()
    .description("Run a command and keep the tail of its output for the resume card")
    .action(runCliCommand);

  program
    .command("init")
    .argument("<shell>", `shell to print the hook for: ${supportedShells.join(", ")}`)
    .description("Print the shell hook to eval in your profile")
    .action(initCommand);

  return program;
}
