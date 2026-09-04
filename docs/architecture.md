# Architecture

ContextResume (`ctxr`) freezes and restores developer context — git state, the last
failing command, and stated intent — when you switch branches or tasks. This
document describes the layers, the pause/resume data flow, the shell-hook
mechanism, the snapshot schema, brain selection, and the privacy model.

## Layers

```
CLI (commander)
  |
Sensors        git | terminal | test-output parser
  |
Brain          heuristic -> claude -p -> ollama
  |
Store          ~/.context-resume/repos/<repoId>/...
  |
Integrations   shell init | Claude Code plugin | MCP server
```

- **CLI**: `commander`-based command surface (`pause`, `resume`, `list`, `diff`,
  `standup`, `handoff`, `init`, `run`, `mcp`), rendered with `@clack/prompts`,
  `boxen`, and `picocolors`.
- **Sensors**: read-only observers of local state — never mutate the repo or
  the shell.
- **Brain**: turns sensor output into `{ intent, lastError, nextAction }`.
- **Store**: append-only-by-timestamp JSON snapshots on disk, no daemon.
- **Integrations**: optional glue for shells and Claude Code, all thin
  wrappers around `pause`/`resume`.

All git access goes through `child_process` calls to the system `git`
binary — no git library dependency.

## Data flow: pause

1. Triggered by the shell hook (branch change detected), `ctxr pause`
   invoked directly, or `--auto` from a Claude Code `Stop`/`PreCompact` hook.
2. Git sensor collects: current branch, HEAD commit, staged/unstaged diff
   stat, modified and untracked file paths, and the base branch comparison
   (see `base` in the schema below).
3. Terminal sensor reads the tail of the current repo's command log
   (`<git common dir>/ctxr-log.tsv`) for the branch being paused: the last
   `ts, cwd, branch, exitCode, cmd` entries, plus captured output from any
   `ctxr run` calls. A failure counts only if the same command did not
   succeed later.
4. The combined sensor output is scrubbed for secrets (see Privacy below).
5. A brain produces the summary (see Brain selection below): a manual
   `ctxr pause` tries `claude -p`, then Ollama, then the heuristic; the
   hook's `ctxr pause --auto` uses the heuristic only.
6. The snapshot is written to
   `~/.context-resume/repos/<repoId>/<branch-slug>/<iso-timestamp>.json` and
   mirrored to `<branch-slug>/latest.json`. Prior snapshots are kept, not
   overwritten — `ctxr list`/`ctxr diff` can walk history.

## Data flow: resume

1. Triggered by the shell hook (branch changed back), `ctxr resume`, or a
   Claude Code `SessionStart` hook running `ctxr resume --format=markdown`.
2. The store loads `latest.json` for the target branch under the current
   `repoId`.
3. The git sensor re-runs against the base branch (main/master/develop,
   auto-detected) to compute how many commits it has gained since the
   snapshot's commit, and which touched files were also changed on base —
   this becomes the "While you were away" section.
4. The resume card is rendered with `boxen`: intent, last error, next
   action, "while you were away", and the action row (`ENTER`/`C`/`D`/`Q`).
5. Action handlers: `ENTER` re-runs the last failing command; `C` writes the
   snapshot as markdown and launches `claude` with it as context (handoff);
   `D` shows the diff since the snapshot; `Q` dismisses the card.

## Shell-hook mechanism

ContextResume does not read shell history files — a history file has no
exit codes, timestamps, or captured output, so it cannot answer "what broke
last." Instead `ctxr init <bash|zsh|pwsh>` prints a small pure-shell snippet
that the user evaluates in their shell profile (e.g.
`eval "$(ctxr init zsh)"`). That snippet hooks the shell's prompt command:

1. On every prompt, it appends one tab-separated line to
   `<git common dir>/ctxr-log.tsv` (`.git/ctxr-log.tsv`, shared by all
   worktrees, never tracked): `ts, cwd, branch, exitCode, cmd` for the
   command that just finished. Tab-separated so the shell needs no escaping.
2. It also cheaply checks the current git branch against the branch recorded
   on the previous prompt.
3. Only when the branch changed does the snippet shell out to Node: it runs
   `ctxr pause` for the branch being left and `ctxr resume` for the branch
   just entered. Every other prompt stays pure shell — no Node process.

Output capture is opt-in: `ctxr run <cmd>` executes a command, tees its
stdout/stderr to the terminal as usual, and stores the last ~40 lines as a
JSON-encoded sixth field of the log entry for that command. Commands run outside `ctxr run` are logged with
their exit code but no captured output.

Auto-pause runs after the switch, so the uncommitted changes it records are
the ones git carried over to the new branch; they belong to the branch being
left. A note given to `ctxr pause` within the last hour is carried into the
auto snapshot. Set `CTXR_NO_AUTO=1` to keep logging but disable auto
pause/resume.

There are no git hooks in this design. Git has no `pre-checkout` hook to
capture state before a branch switch, and `post-checkout` fires after the
old branch's state is already gone — too late to snapshot it. The shell
prompt hook observes the branch transition directly and can pause the old
branch before it's left. See `docs/adr/0002-shell-hook-not-git-hook.md`.

## Repo identity

A repo's identity (`repoId`) is the SHA of its root commit:
`git rev-list --max-parents=0 HEAD`. This is shared by every git worktree of
the same repository, so snapshots taken from any worktree land in the same
`repoId` directory and are visible from any other worktree.

## Storage layout

```
<repo>/.git/ctxr-log.tsv             # terminal sensor: append-only command log

~/.context-resume/
  repos/
    <repoId>/
      <branch-slug>/
        <iso-timestamp>.json        # one snapshot
        latest.json                 # mirror of the newest snapshot
```

### Snapshot schema

```json
{
  "version": "2.0",
  "repoId": "8f1c2e9a4b7d3f0e1c6a5b9d8e7f0a1b2c3d4e5f",
  "repo": {
    "name": "my-project",
    "path": "C:/Users/yigit/Desktop/my-project",
    "branch": "feature/jwt-auth",
    "commit": "a1b2c3d"
  },
  "timestamp": "2026-09-04T20:45:00Z",
  "note": "chasing the refresh-token bug",
  "git": {
    "modifiedFiles": ["src/auth.ts", "src/token.ts", "tests/auth.test.ts"],
    "diffStat": "3 files changed, 45 insertions(+), 12 deletions(-)"
  },
  "base": {
    "branch": "main",
    "aheadBy": 4,
    "behindBy": 0,
    "overlappingFiles": ["src/auth.ts"]
  },
  "terminal": {
    "lastCommands": [
      { "ts": "2026-09-04T20:40:11Z", "cwd": ".", "cmd": "pnpm test tests/auth.test.ts", "exitCode": 1 }
    ],
    "lastCommand": "pnpm test tests/auth.test.ts",
    "exitCode": 1,
    "errorSnippet": "TokenExpiredError: jwt expired at auth.ts:42"
  },
  "aiSummary": {
    "intent": "Refactoring the token refresh flow in the JWT auth service.",
    "lastError": "TokenExpiredError: jwt expired at auth.ts:42",
    "nextAction": "Check the clock tolerance value at auth.ts:42.",
    "provider": "heuristic"
  }
}
```

`note` is an optional short string the user passes to `ctxr pause "<note>"`.
`base` is computed at resume time, since it depends on the current state of
the base branch, and feeds the "while you were away" section.

## Brain selection

A brain turns the sensor output into `{ intent, lastError, nextAction }`.
Three exist, tried in this order; the first usable answer wins:

1. **`claude -p`** — the headless Claude Code CLI, if `claude` is on the
   PATH. Runs with `--model haiku` (override with `CTXR_CLAUDE_MODEL`), an
   empty MCP config so no servers load, and the prompt on stdin. Roughly
   7-20 seconds per call.
2. **Ollama** — if `http://localhost:11434` answers (override with
   `CTXR_OLLAMA_HOST`). Picks an installed model whose name contains
   `coder`, then `qwen`, then the first one; `CTXR_OLLAMA_MODEL` overrides.
   Uses `format: "json"` and temperature 0.
3. **Heuristic** — rule-based, always available, instant. Looks at changed
   file names, the note, and the captured failing command.

Each AI brain gets `CTXR_BRAIN_TIMEOUT` milliseconds (default 30000); on
timeout, error, or unparseable output the next brain is tried, and the
heuristic always answers in the end. `CTXR_BRAIN=claude|ollama|heuristic`
pins a single brain, `--no-ai` on `pause` and `resume` skips the AI brains,
and `CTXR_DEBUG=1` prints why a brain was skipped.

When the AI runs:

- `ctxr pause` (manual) runs the brains before writing the snapshot, with a
  spinner.
- `ctxr pause --auto` (from the shell hook) stores the heuristic summary
  only, so a branch switch never blocks on a model.
- `ctxr resume` (manual) upgrades a heuristic-only snapshot with the AI
  brains and writes the result back, so the next resume is instant.
- `ctxr resume --auto` shows whatever is stored, never calls a model.

The prompt contains the note, changed files and diff stat, the last few
commands with exit codes, the failing command and parsed error, and a diff
excerpt capped at 4000 characters (`git.diffExcerpt` in the snapshot). All
of it has already been through the secret scrub.

## Privacy model

Everything is stored locally under `~/.context-resume`. Nothing leaves the
machine unless the user opts into the `claude` or `ollama` brain, and in
that case only the already-scrubbed sensor output for that snapshot is sent.

Before a snapshot is written, its contents are scrubbed with regexes for
common secret shapes: AWS access keys, GitHub tokens, JWTs, and
`KEY=`/`TOKEN=`/`SECRET=`-style environment assignments. This scrub is
best-effort, not a guarantee — see `SECURITY.md`.
