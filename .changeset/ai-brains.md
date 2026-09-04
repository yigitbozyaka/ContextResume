---
"context-resume": minor
---

Add AI summaries: `ctxr pause` and `ctxr resume` now ask the Claude Code CLI (`claude -p`) or a local Ollama server for the intent, blocking error, and next step, falling back to the heuristic. Pin with `CTXR_BRAIN`, tune with `CTXR_BRAIN_TIMEOUT`, `CTXR_CLAUDE_MODEL`, `CTXR_OLLAMA_MODEL`, or skip with `--no-ai`. Snapshots now keep a diff excerpt.
