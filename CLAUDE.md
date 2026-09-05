# ContextResume (`ctxr`)

CLI that freezes and restores a developer's working context per git branch:
git state, last failing command, and intent. TypeScript, Node >= 20, pnpm.

## Commands

- `pnpm dev -- <args>`  run the CLI from source (`pnpm dev -- resume`)
- `pnpm test`           vitest
- `pnpm lint`           biome check (use `pnpm lint:fix` to apply)
- `pnpm typecheck`      tsc --noEmit
- `pnpm build`          tsup -> dist/cli.js
- `pnpm changeset`      add a changeset for user-facing changes

## Start here, not by scanning src/

1. `docs/roadmap.md` says which phase is done and what is next.
2. `docs/architecture.md` describes layers, data flow, and the snapshot schema.
3. `docs/adr/` records decisions. Do not reopen them without a new ADR.

## Layout

- `src/cli.ts` entry, `src/program.ts` commander setup
- `src/commands/` one file per command
- `src/sensors/` git, terminal log, test-output parsers
- `src/brain/` summarizers: heuristic, claude, ollama, and the selector
- `src/store/` snapshot paths, read/write, repo identity
- `src/shell/` bash/zsh/pwsh snippets printed by `ctxr init`
- `src/ui/` terminal card and markdown rendering
- `plugin/` Claude Code plugin (hooks + skill); `.claude-plugin/marketplace.json` publishes it
- `tests/` vitest; parser fixtures live in `tests/fixtures/`

## Conventions

- No code comments. Use self-explanatory names.
- Git via `child_process`, no git library. New dependencies need a reason in the PR.
- Conventional Commits. Feature branches (`feat/`, `fix/`, `docs/`, `chore/`), PR, squash merge.
- Every PR: tests, docs touched if behavior changed, changeset if user-facing.
- Docs, commits, and PRs are in English. No unmeasured performance claims.
- Snapshots are scrubbed for secrets before writing. Never log snapshot contents.
- Update `docs/roadmap.md` at the end of each PR.

## Delegation

Mechanical work (fixtures, parser regexes, doc drafts, lint fixes) goes to a Sonnet subagent.
Self-contained modules with a clear spec can go to an Opus subagent.
