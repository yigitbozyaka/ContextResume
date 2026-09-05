# Roadmap

**Current status:** v0.3.0 released; all five phases complete. Next: real-world use, then v1.0.0.

This roadmap tracks ContextResume from bootstrap to a v1.0.0 npm release.
Each phase lists the planned PRs; check them off as they land.

## Phase 0 — Bootstrap

- [x] Repo scaffold: TypeScript, pnpm, tsup, vitest, biome, changesets
- [x] `ctxr` CLI entry point with commander

## Phase 1 — Store + git sensor + heuristic card + secret scrub

- [x] `feat: add local snapshot store under ~/.context-resume`
- [x] `feat: add git sensor (branch, diff stat, modified files)`
- [x] `feat: add heuristic brain and resume card renderer`
- [x] `feat: add secret scrubbing before snapshot write`
- [x] `feat: add pause, resume, and list commands`

Target: a working local loop of `ctxr pause` / `ctxr resume` / `ctxr list`
with no shell integration and no AI brain.

## Phase 2 — Shell integration, run, test parser, rerun action

- [x] `feat: add ctxr init for bash, zsh, and pwsh shell hooks`
- [x] `feat: add ctxr run for opt-in output capture`
- [x] `feat: add test-output parser for jest, vitest, pytest, go test, cargo test`
- [x] `feat: add ENTER rerun action to the resume card`
- [x] `chore: release v0.1.0`

Target: **v0.1.0**.

## Phase 3 — AI brains

- [x] `feat: add claude -p brain`
- [x] `feat: add ollama brain`
- [x] `feat: add CTXR_BRAIN override and configurable timeout fallback`

## Phase 4 — Claude Code handoff, plugin, ctxr handoff

- [x] `feat: add [C] handoff action (markdown snapshot + claude launch)`
- [x] `feat: add Claude Code plugin (SessionStart, Stop, PreCompact hooks, /ctxr skill)`
- [x] `feat: add ctxr handoff command for PR comments and teammates`
- [x] `feat: add ctxr diff command`
- [x] `chore: release v0.2.0`

Target: **v0.2.0**.

## Phase 5 — MCP server, standup, publish

- [x] `feat: add ctxr mcp stdio server (get_context, list_snapshots, save_snapshot)`
- [x] `feat: add ctxr standup command`
- [x] `docs: add demo GIF` (rendered by the Demo GIF workflow from `docs/demo.tape`)
- [x] `chore: release v0.3.0` (npm publish follows each release)

Target: **v1.0.0** once the shell hooks have seen real use on macOS and Linux.

## Open questions

- Fish shell support: `ctxr init` currently targets bash, zsh, and pwsh. Fish
  has different function/prompt-hook syntax; worth a dedicated PR if there's
  demand.
- Windows `cmd.exe` is not supported and likely never will be — it has no
  reasonable equivalent of a prompt-command hook. PowerShell is the
  supported path on Windows.
- Multi-machine sync (e.g. syncing `~/.context-resume` between a laptop and
  a desktop) is out of scope for now; the tool is designed to be
  single-machine and fully local.
