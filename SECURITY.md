# Security

## Data stays local

ContextResume stores everything under `~/.context-resume` on your own
machine. Nothing is sent anywhere unless you explicitly opt into the
`claude` or `ollama` brain for AI-generated summaries — and in that case
only the already-scrubbed contents of a single snapshot are sent to that
brain, not your full repository.

## What is stored

- Command log: `~/.context-resume/log/<repoId>.jsonl` — timestamp, working
  directory, command text, and exit code for commands run in a shell with
  the ContextResume hook enabled, plus captured output for commands run via
  `ctxr run`.
- Snapshots: `~/.context-resume/repos/<repoId>/<branch-slug>/*.json` — git
  branch/commit/diff metadata, the terminal log tail, and the generated
  summary for a given pause.

`repoId` is derived from your repository's root commit SHA, not from any
network call.

## Secret scrubbing is best-effort

Before a snapshot is written, its text fields are checked against regexes
for common secret shapes: AWS access keys, GitHub tokens, JWTs, and
`KEY=`/`TOKEN=`/`SECRET=`-style assignments. This is a best-effort filter,
not a guarantee. It can miss secrets in formats it doesn't recognize.
Don't rely on it as your only safeguard — avoid running `ctxr run` on
commands whose output may contain sensitive values you don't want written
to disk.

## Deleting your data

All ContextResume data lives under a single directory. To remove it
entirely:

```bash
rm -rf ~/.context-resume
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force "$HOME\.context-resume"
```

## Reporting a vulnerability

Please report security vulnerabilities using GitHub's private vulnerability
reporting for this repository (Security tab -> Report a vulnerability) at
https://github.com/yigitbozyaka/context-resume. Do not open a public issue
for security reports.
