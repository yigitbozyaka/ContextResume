import pc from "picocolors";
import { isInsideRepo, repoId } from "../sensors/git.js";
import { listLatest } from "../store/snapshot.js";
import { relativeTime } from "../ui/card.js";

export async function listCommand(options: { all?: boolean }, cwd = process.cwd()): Promise<void> {
  const scope = !options.all && (await isInsideRepo(cwd)) ? await repoId(cwd) : undefined;
  const snapshots = await listLatest(scope);
  if (!snapshots.length) {
    console.log(
      `${pc.yellow("No snapshots yet.")} Run ${pc.bold("ctxr pause")} inside a repository.`,
    );
    return;
  }
  const showRepo = !scope;
  for (const s of snapshots) {
    const where = showRepo
      ? `${pc.dim(s.repo.name)} ${pc.cyan(s.repo.branch)}`
      : pc.cyan(s.repo.branch);
    console.log(`${where}  ${pc.dim(relativeTime(s.timestamp))}\n  ${s.aiSummary.intent}`);
    if (s.terminal.lastCommand) console.log(`  ${pc.red("blocked:")} ${s.terminal.lastCommand}`);
  }
}
