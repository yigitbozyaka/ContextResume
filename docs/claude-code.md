# Claude Code integration

ContextResume treats Claude Code as a second developer who shares your
memory. Three pieces connect them; each works on its own.

## 1. Handoff from the card

`ctxr resume` ends with an action menu. "Hand off to Claude Code" writes the
snapshot as markdown to a temp file and launches `claude` in the repository
with a one-line prompt: read that file, then continue with the recorded next
step. Claude starts with the intent, the failing command, the parsed error,
the changed files, recent commands, and a diff excerpt, without you retyping
any of it.

`ctxr handoff` prints the same markdown to stdout for a PR comment, a
teammate, or any other agent.

## 2. The plugin

The plugin lives in [`plugin/`](../plugin) and does two things:

| Hook | Command | Effect |
|---|---|---|
| `SessionStart` (startup, resume, clear) | `ctxr resume --auto --format markdown` | The current branch's snapshot is injected into the session as context. Prints nothing when there is no snapshot. |
| `Stop`, `PreCompact` | `ctxr pause --auto` | The branch is snapshotted after every turn and before compaction, so the last state survives a closed terminal or a compacted context. |

Auto snapshots taken within 15 minutes of each other replace the previous
file instead of piling up, and a note given manually within the last hour is
carried forward.

It also ships the `/context-resume:ctxr` skill, which tells Claude how to
restore, save (with a note written from the conversation), and hand off
context. Inside Claude Code the skill always passes `--no-ai`: Claude is the
summarizer there, and the AI brains would otherwise spawn a nested `claude`.

### Install

```
npm i -g context-resume
/plugin marketplace add yigitbozyaka/ContextResume
/plugin install context-resume@context-resume
```

The hooks call `ctxr` from the PATH, so the CLI has to be installed globally.

### Try it from a checkout

```
claude --plugin-dir ./plugin
```

## 3. The MCP server

`ctxr mcp` speaks the Model Context Protocol over stdio, so Claude Code,
Claude Desktop, and any other MCP client can read and write your context
directly instead of shelling out.

| Tool | Input | Result |
|---|---|---|
| `get_context` | `branch?`, `repo?` | The branch's snapshot as markdown: intent, last failing command, parsed error, changed files, recent commands, and a diff excerpt. Says so plainly when there is no snapshot yet. |
| `list_snapshots` | `repo?`, `all?` | JSON array of the latest snapshot per branch — repo name, path, branch, timestamp, intent, next action, and the last command when there is one. `all` widens it from one repository to every recorded one. |
| `save_snapshot` | `note?`, `repo?` | Freezes the repository's current context with the note and reports the branch and how many files changed. |

`save_snapshot` never calls a summarizer: inside an MCP session the client
is the model, so the note it writes is the summary and no nested `claude`
is spawned.

Every tool takes an optional `repo`, an absolute path to a git checkout.
It defaults to the server's working directory, so a client can ask about a
checkout other than the one the server was started in.

### Add it to Claude Code

```
claude mcp add context-resume -- ctxr mcp
```

### Add it to Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "context-resume": {
      "command": "ctxr",
      "args": ["mcp"]
    }
  }
}
```

Both entries call `ctxr` from the PATH, so the CLI has to be installed
globally (`npm i -g context-resume`).

## Why hooks instead of a bigger CLAUDE.md

A `CLAUDE.md` describes the project; it cannot say what you were doing on
this branch an hour ago. The hooks put that in front of Claude at the moment
it matters and refresh it as the work moves, with nothing to maintain by hand.
