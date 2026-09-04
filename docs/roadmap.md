# Roadmap

**Current status:** Phase 2 complete. Next: tag v0.1.0, then Phase 3 (AI brains).

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
- [ ] `chore: release v0.1.0`

Target: **v0.1.0**.

## Phase 3 — AI brains

- [ ] `feat: add claude -p brain`
- [ ] `feat: add ollama brain`
- [ ] `feat: add CTXR_BRAIN override and 8s timeout fallback`

## Phase 4 — Claude Code handoff, plugin, ctxr handoff

- [ ] `feat: add [C] handoff action (markdown snapshot + claude launch)`
- [ ] `feat: add Claude Code plugin (SessionStart, Stop, PreCompact hooks, /ctxr skill)`
- [ ] `feat: add ctxr handoff command for PR comments and teammates`
- [ ] `feat: add ctxr diff command`
- [ ] `chore: release v0.3.0`

Target: **v0.3.0**.

## Phase 5 — MCP server, standup, publish

- [ ] `feat: add ctxr mcp stdio server (get_context, list_snapshots, save_snapshot)`
- [ ] `feat: add ctxr standup command`
- [ ] `docs: add demo GIF`
- [ ] `chore: publish to npm and release v1.0.0`

Target: **v1.0.0**.

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
