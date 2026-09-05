import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { pause } from "../commands/pause.js";
import { resume } from "../commands/resume.js";
import { currentBranch, repoId } from "../sensors/git.js";
import { listLatest } from "../store/snapshot.js";
import { renderMarkdown } from "../ui/markdown.js";
import { version } from "../version.js";

const repoInput = z
  .string()
  .optional()
  .describe("Absolute path to a git checkout. Defaults to the server's working directory.");

function textResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

function errorResult(error: unknown) {
  return textResult(error instanceof Error ? error.message : String(error), true);
}

export function createMcpServer(defaultCwd = process.cwd()): McpServer {
  const server = new McpServer({ name: "context-resume", version });

  server.registerTool(
    "get_context",
    {
      title: "Get branch context",
      description:
        "Read the saved ContextResume snapshot for a branch: intent, last failing command, error, changed files, recent commands, and a diff excerpt, as markdown.",
      inputSchema: {
        branch: z
          .string()
          .optional()
          .describe("Branch to read. Defaults to the checked-out branch."),
        repo: repoInput,
      },
    },
    async ({ branch, repo }) => {
      const cwd = repo ?? defaultCwd;
      try {
        const result = await resume(branch, cwd);
        if (!result) {
          const target = branch ?? (await currentBranch(cwd));
          return textResult(`No snapshot for ${target} in ${cwd}. Run \`ctxr pause\` there first.`);
        }
        return textResult(renderMarkdown(result.snapshot, result.base, { full: true }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "list_snapshots",
    {
      title: "List snapshots",
      description:
        "List the latest snapshot of every branch as JSON, for one repository or for all of them.",
      inputSchema: {
        repo: repoInput,
        all: z
          .boolean()
          .optional()
          .describe("Include every repository instead of only the one at `repo`."),
      },
    },
    async ({ repo, all }) => {
      const cwd = repo ?? defaultCwd;
      try {
        const snapshots = all ? await listLatest() : await listLatest(await repoId(cwd));
        const entries = snapshots.map((snapshot) => ({
          repo: snapshot.repo.name,
          path: snapshot.repo.path,
          branch: snapshot.repo.branch,
          timestamp: snapshot.timestamp,
          intent: snapshot.aiSummary.intent,
          nextAction: snapshot.aiSummary.nextAction,
          ...(snapshot.terminal.lastCommand ? { lastCommand: snapshot.terminal.lastCommand } : {}),
        }));
        return textResult(JSON.stringify(entries, null, 2));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "save_snapshot",
    {
      title: "Save snapshot",
      description:
        "Freeze the current context of a repository with an optional note describing what you were doing.",
      inputSchema: {
        note: z.string().optional().describe("Short note about the work in progress."),
        repo: repoInput,
      },
    },
    async ({ note, repo }) => {
      const cwd = repo ?? defaultCwd;
      try {
        const snapshot = await pause(note, { ai: false }, cwd);
        const count = snapshot.git.modifiedFiles.length;
        return textResult(
          `Saved ${snapshot.repo.branch} in ${snapshot.repo.name}: ${count} changed file${count === 1 ? "" : "s"}.`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

export async function startMcpServer(cwd = process.cwd()): Promise<void> {
  const server = createMcpServer(cwd);
  await server.connect(new StdioServerTransport());
}
