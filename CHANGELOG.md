# Changelog

## 0.2.0

### Minor Changes

- 74232a2: Add AI summaries: `ctxr pause` and `ctxr resume` now ask the Claude Code CLI (`claude -p`) or a local Ollama server for the intent, blocking error, and next step, falling back to the heuristic. Pin with `CTXR_BRAIN`, tune with `CTXR_BRAIN_TIMEOUT`, `CTXR_CLAUDE_MODEL`, `CTXR_OLLAMA_MODEL`, or skip with `--no-ai`. Snapshots now keep a diff excerpt.
- a34e909: Add the Claude Code bridge: a "Hand off to Claude Code" action on the resume card, `ctxr handoff` markdown output, `ctxr resume --format markdown|json`, `ctxr diff`, and a Claude Code plugin (`plugin/`) whose SessionStart hook injects the branch snapshot and whose Stop/PreCompact hooks snapshot every turn. Auto snapshots within 15 minutes coalesce into one file.

## 0.1.0

First usable release. Everything runs locally with no AI dependency.

### Minor Changes

- 9f9eabf: Add `ctxr pause`, `ctxr resume`, and `ctxr list`: local snapshot store under `~/.context-resume`, git sensor, heuristic summary, "while you were away" base-branch comparison, and secret scrubbing before snapshots are written.
- 113f16c: Add `ctxr init` shell hooks (bash, zsh, PowerShell) that log every command's exit code and automatically pause/resume on branch change, `ctxr run` for output capture, test-output parsing for Jest, Vitest, pytest, go test and cargo test, and a rerun action on the resume card.
