import { spawn } from "node:child_process";
import { currentBranch, isInsideRepo } from "../sensors/git.js";
import { appendLogEntry, outputTailLines } from "../sensors/terminal.js";

export function runCommand(args: string[], cwd = process.cwd()): Promise<number> {
  const cmd = args.join(" ");
  const tail: string[] = [];
  const remember = (chunk: Buffer) => {
    tail.push(...chunk.toString().split(/\r?\n/));
    if (tail.length > outputTailLines * 2) tail.splice(0, tail.length - outputTailLines);
  };
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd, shell: true, stdio: ["inherit", "pipe", "pipe"] });
    child.stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      remember(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
      remember(chunk);
    });
    child.on("close", async (code) => {
      const exitCode = code ?? 1;
      if (await isInsideRepo(cwd)) {
        await appendLogEntry(cwd, {
          ts: new Date().toISOString(),
          cwd,
          branch: await currentBranch(cwd),
          cmd,
          exitCode,
          output: tail.slice(-outputTailLines).join("\n"),
        }).catch(() => undefined);
      }
      resolve(exitCode);
    });
  });
}

export async function runCliCommand(args: string[]): Promise<void> {
  if (!args.length) throw new Error("Usage: ctxr run <command...>");
  process.exitCode = await runCommand(args);
}
