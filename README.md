# ContextResume

Freeze your developer context before you switch branches. Get it back the
instant you return.

**Status: pre-release, under active development.**

## The problem

Switching branches or tasks throws away the state that actually matters:
what you were trying to do, what broke, and what you were about to try
next. Research on interrupted work found that returning to a prior task
after an interruption takes an average of about 23 minutes to regain the
same depth of focus (Gloria Mark et al., "The Cost of Interrupted Work: More
Speed and Stress", CHI 2008). `git stash` keeps your diff; it doesn't keep
your intent, your last failing test, or your next step.

ContextResume watches your terminal and your git state, summarizes them
locally, and hands you a resume card the moment you switch back.

## The resume card

```
┌────────────────────────────────────────────────────────────────────────┐
│  ContextResume -- feature/jwt-auth                                     │
│  Last active: Thursday 17:45 (2 days ago)                              │
├────────────────────────────────────────────────────────────────────────┤
│  WHAT YOU WERE DOING                                                    │
│  Refactoring the token refresh flow in the JWT auth service.           │
│  3 files changed: src/auth.ts, src/token.ts, tests/auth.test.ts        │
│                                                                          │
│  LAST FAILING COMMAND                                                   │
│  Command: pnpm test tests/auth.test.ts (exit code: 1)                  │
│  Error:   TokenExpiredError: jwt expired at auth.ts:42                 │
│                                                                          │
│  NEXT STEP                                                              │
│  Check the clock tolerance value at auth.ts:42.                        │
├────────────────────────────────────────────────────────────────────────┤
│  WHILE YOU WERE AWAY                                                    │
│  main gained 4 commits. 1 overlapping file (src/auth.ts) --            │
│  possible conflict risk.                                                │
├────────────────────────────────────────────────────────────────────────┤
│  Choose an action:                                                      │
│  > [ENTER]  Rerun the last failing command                             │
│    [C]      Hand off to Claude Code with this context                  │
│    [D]      View the diff since this snapshot                          │
│    [Q]      Dismiss                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm i -g context-resume
# or, without installing
npx context-resume --help
```

## Shell setup

ContextResume does not read your shell history — history files carry no
exit codes or output. Instead, `ctxr init` prints a shell snippet that hooks
your prompt: it logs each command's timestamp, directory, branch, and exit
code to `.git/ctxr-log.tsv`, and only when your branch changes does it call
`ctxr pause` for the branch you left and `ctxr resume` for the one you
entered. Set `CTXR_NO_AUTO=1` to keep the log but skip the automatic card.

```bash
# zsh
eval "$(ctxr init zsh)"

# bash
eval "$(ctxr init bash)"
```

```powershell
# PowerShell (add to $PROFILE)
Invoke-Expression (& ctxr init pwsh | Out-String)
```

To capture a command's output for the card, not just its exit code, run it
through `ctxr run`:

```bash
ctxr run pnpm test tests/auth.test.ts
```

## Commands

| Command | Description |
|---|---|
| `ctxr pause [note]` | Freeze the current branch's context, with an optional short note. |
| `ctxr resume [branch]` | Show the resume card (`--format markdown\|json` for machines). |
| `ctxr list` | List all recorded branches and their snapshots. |
| `ctxr diff` | Show commits and working-tree changes since the snapshot. |
| `ctxr run <cmd>` | Run a command, capturing the last ~40 lines of its output into the log. |
| `ctxr init <bash\|zsh\|pwsh>` | Print the shell snippet to eval in your profile. |
| `ctxr standup [--since 24h] [--format markdown]` | Summarize recent activity across every repo and branch. |
| `ctxr handoff` | Print the snapshot as markdown for a PR comment, a teammate, or an agent. |
| `ctxr mcp` | Start the stdio MCP server for Claude Code / Claude Desktop. |

## AI summaries

The card works without any model. If the Claude Code CLI (`claude`) is on
your PATH, or an [Ollama](https://ollama.com) server is running locally,
`ctxr pause` and `ctxr resume` use it to turn the raw signals into a one-line
intent, the blocking error, and a concrete next step. Order: `claude -p`,
then Ollama, then the built-in heuristic. The automatic hook never waits on a
model; a manual `ctxr resume` upgrades the stored summary once and caches it.

| Variable | Effect |
|---|---|
| `CTXR_BRAIN=claude\|ollama\|heuristic` | Pin one summarizer. |
| `CTXR_BRAIN_TIMEOUT=30000` | Per-brain timeout in milliseconds. |
| `CTXR_CLAUDE_MODEL=haiku` | Model passed to `claude -p`. |
| `CTXR_OLLAMA_HOST`, `CTXR_OLLAMA_MODEL` | Ollama server and model. |
| `CTXR_NO_AUTO=1` | Keep logging, skip the automatic card on branch change. |
| `CTXR_DEBUG=1` | Explain why a summarizer was skipped. |

Pass `--no-ai` to `pause` or `resume` to skip models for one call.

## Claude Code integration

ContextResume treats Claude Code as a second developer who shares your
memory. Details in [docs/claude-code.md](./docs/claude-code.md).

- **Handoff** — pick "Hand off to Claude Code" on the resume card, or run
  `ctxr handoff` for markdown you can paste anywhere. Claude starts with the
  intent, the failing command, the error, and the next step already in hand.
- **Plugin** — a `SessionStart` hook injects the branch's snapshot into every
  new session; `Stop` and `PreCompact` hooks snapshot the branch after each
  turn and before compaction; the `/context-resume:ctxr` skill lets Claude
  save a note in its own words.

```
npm i -g context-resume
/plugin marketplace add yigitbozyaka/ContextResume
/plugin install context-resume@context-resume
```

- **MCP server** — `ctxr mcp` serves `get_context`, `list_snapshots`, and
  `save_snapshot` over stdio, so Claude Code (`claude mcp add
  context-resume -- ctxr mcp`), Claude Desktop, or any other MCP client can
  read and write your context directly.

## Privacy

Everything is stored locally under `~/.context-resume`. Nothing leaves your
machine unless you opt into the `claude` or `ollama` brain for AI
summaries. Before a snapshot is saved, it's scrubbed with regexes for
common secret shapes: AWS keys, GitHub tokens, JWTs, and
`KEY=`/`TOKEN=`/`SECRET=`-style assignments. See [SECURITY.md](./SECURITY.md).

## Built with Claude Code

ContextResume is developed using Claude Code, and it ships first-class
support for it in return: a Claude Code plugin (hooks + `/ctxr` skill) and
an MCP server, both described above, so Claude Code sessions can read and
write your context directly.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT (c) Yiğit Bozyaka
