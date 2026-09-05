---
"context-resume": minor
---

Add the Claude Code bridge: a "Hand off to Claude Code" action on the resume card, `ctxr handoff` markdown output, `ctxr resume --format markdown|json`, `ctxr diff`, and a Claude Code plugin (`plugin/`) whose SessionStart hook injects the branch snapshot and whose Stop/PreCompact hooks snapshot every turn. Auto snapshots within 15 minutes coalesce into one file.
