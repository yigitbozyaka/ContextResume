# ADR 0002: Shell prompt hook instead of git hooks or history files

Status: accepted. Date: 2026-09-05.

## Context

Two features need data that is not on disk: the exit code and output of the last
command, and the moment a developer leaves a branch.

- Shell history files (`.bash_history`, `.zsh_history`, `ConsoleHost_history.txt`)
  store command text only. No exit codes, no output, no working directory.
- Git has no `pre-checkout` hook. `post-checkout` fires after the working tree has
  already moved, so the old branch cannot be snapshotted from there.

## Decision

`ctxr init <shell>` prints a pure-shell snippet the user adds to their profile
(the same pattern as zoxide, direnv, and starship). On every prompt it:

1. appends `{ts, cwd, cmd, exitCode}` to `~/.context-resume/log/<repoId>.jsonl`;
2. compares the current branch with the last seen branch for that repo;
3. only when the branch changed, calls `ctxr pause` for the old branch and
   `ctxr resume` for the new one.

Output capture is opt-in through `ctxr run <cmd>`, which tees the tail of
stdout and stderr into the same log.

## Consequences

- Automatic pause/resume works with `git switch`, `git checkout`, worktrees, and IDE
  branch switches, because it observes the result rather than the command.
- Users who skip `ctxr init` still get manual `ctxr pause` / `ctxr resume`.
- The hook must stay pure shell and fast; anything that needs Node runs only on a
  branch change.
- cmd.exe is not supported. PowerShell, bash, and zsh are; fish is an open question.
