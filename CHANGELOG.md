# Changelog

## 0.1.0

First usable release. Everything runs locally with no AI dependency.

### Minor Changes

- 9f9eabf: Add `ctxr pause`, `ctxr resume`, and `ctxr list`: local snapshot store under `~/.context-resume`, git sensor, heuristic summary, "while you were away" base-branch comparison, and secret scrubbing before snapshots are written.
- 113f16c: Add `ctxr init` shell hooks (bash, zsh, PowerShell) that log every command's exit code and automatically pause/resume on branch change, `ctxr run` for output capture, test-output parsing for Jest, Vitest, pytest, go test and cargo test, and a rerun action on the resume card.
