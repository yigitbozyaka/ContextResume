import { createRequire } from "node:module";
import { Command } from "commander";
import { diffCommand } from "./commands/diff.js";
import { handoffCommand } from "./commands/handoff.js";
import { initCommand, supportedShells } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { mcpCommand } from "./commands/mcp.js";
import { pauseCommand } from "./commands/pause.js";
import { resumeCommand } from "./commands/resume.js";
import { runCliCommand } from "./commands/run.js";
import { standupCommand } from "./commands/standup.js";

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
    .option("--no-ai", "skip AI summarizers and use the heuristic only")
    .description("Save the current branch's context")
    .action(pauseCommand);

  program
    .command("resume")
    .alias("r")
    .argument("[branch]", "branch to resume (defaults to the current one)")
    .option("--json", "print the snapshot as JSON instead of the card")
    .option("--format <format>", "output format: card, markdown, or json", "card")
    .option("--auto", "non-interactive mode used by hooks")
    .option("--no-ai", "skip AI summarizers and use the heuristic only")
    .description("Show the resume card for a branch")
    .action(resumeCommand);

  program
    .command("list")
    .alias("l")
    .option("-a, --all", "include every repository, not only the current one")
    .description("List saved snapshots")
    .action(listCommand);

  program
    .command("diff")
    .alias("d")
    .argument("[branch]", "branch whose snapshot to compare against")
    .description("Show commits and changes since the last snapshot")
    .action((branch?: string) => diffCommand(branch));

  program
    .command("handoff")
    .argument("[branch]", "branch to hand off (defaults to the current one)")
    .description("Print the snapshot as markdown for a PR comment, a teammate, or an agent")
    .action(handoffCommand);

  program
    .command("standup")
    .option("--since <duration>", "look-back window such as 24h, 2d, or 1w", "24h")
    .option("--format <format>", "output format: text or markdown", "text")
    .description("Summarize recent activity across every repository and branch")
    .action(standupCommand);

  program
    .command("run")
    .argument("<command...>", "command to run")
    .passThroughOptions()
    .description("Run a command and keep the tail of its output for the resume card")
    .action(runCliCommand);

  program
    .command("mcp")
    .description(
      "Start the stdio MCP server exposing get_context, list_snapshots, and save_snapshot",
    )
    .action(mcpCommand);

  program
    .command("init")
    .argument("<shell>", `shell to print the hook for: ${supportedShells.join(", ")}`)
    .description("Print the shell hook to eval in your profile")
    .action(initCommand);

  return program;
}
