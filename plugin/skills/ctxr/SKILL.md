---
name: ctxr
description: Save or restore the developer's branch context with ContextResume (ctxr). Use when the user asks where they left off, wants to resume a branch, wants to save what they were doing, or wants a handoff summary for a PR or teammate.
allowed-tools: Bash(ctxr *)
---

ContextResume (`ctxr`) stores one snapshot per git branch: the intent, the
changed files, the last failing command with its parsed error, and the next
step. The plugin's SessionStart hook already injects the current branch's
snapshot when a session begins; use these commands for anything beyond that.

## Restore context

```bash
ctxr resume --format markdown --no-ai            # current branch
ctxr resume --format markdown --no-ai <branch>   # another branch
ctxr list                                        # every saved branch in this repo
ctxr diff                                        # commits and changes since the snapshot
```

Always pass `--no-ai` inside Claude Code: you are the summarizer here, and
the AI brains would spawn another `claude` process.

## Save context

When the user finishes a piece of work, switches tasks, or asks you to save,
write a note that a future reader can act on: what was being done, what is
blocking, and the concrete next step, in one or two sentences.

```bash
ctxr pause --no-ai "Refactoring token refresh in src/auth.ts; tests/auth.test.ts fails on clock skew, next: add 30s tolerance at auth.ts:42"
```

Prefer the user's own words for the intent. Do not paste secrets or long
logs into the note.

## Hand off

```bash
ctxr handoff            # markdown for a PR comment, a teammate, or another agent
```

Paste the output where the user asked for it. It includes recent commands and
a diff excerpt, so review it before posting publicly.

## Notes

- Everything is local under `~/.context-resume`; nothing is uploaded.
- `ctxr` must be on the PATH (`npm i -g context-resume`). If a command is not
  found, tell the user how to install it instead of trying alternatives.
