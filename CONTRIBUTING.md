# Contributing

Thanks for considering a contribution to ContextResume.

## Setup

```bash
pnpm install
pnpm dev        # run the CLI from source (tsx src/cli.ts)
pnpm test       # run the vitest suite
pnpm lint       # biome check
pnpm typecheck  # tsc --noEmit
pnpm build      # tsup build to dist/
```

Node >= 20 and pnpm are required. Git is invoked via `child_process` in this
project, not a git library — keep new git access consistent with that.

## Branch naming

Use a prefix that matches the change:

- `feat/…` — new functionality
- `fix/…` — bug fixes
- `docs/…` — documentation only
- `chore/…` — tooling, deps, maintenance

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g.
`feat: add ctxr diff command`, `fix: handle detached HEAD in git sensor`).

## Pull request flow

1. Branch from `main`.
2. Open a PR against `main`. The PR title becomes the squash-merge commit
   message, so write it as a proper Conventional Commit.
3. Squash merge once approved and green.

## Changesets

Any user-facing change (new command, changed flag, changed output format,
changed snapshot schema) needs a changeset:

```bash
pnpm changeset
```

Internal refactors, tests, and docs-only changes don't require one.

## Code style

No code comments — anywhere, in any language. Use self-explanatory names
for variables, functions, and files instead of narrating what the code
does. If you're touching a file that already has comments, leave the
existing ones alone unless the task asks you to change that code; just
don't add new ones.

## Adding a test-output parser

If you add support for a new test runner's output format (alongside jest,
vitest, pytest, go test, cargo test), include a fixture: a captured sample
of that runner's real stdout/stderr under the parser's test fixtures, used
to assert the parser extracts the right file, line, and error message.

## Releases

Releases are automated. Every user-facing PR carries a changeset; when it
lands on `main`, the Release workflow opens or updates a "chore: release"
pull request that bumps `package.json`, the plugin manifests, and
`CHANGELOG.md`. Merging that PR runs `npm stage publish --provenance` through GitHub Actions
trusted publishing (no tokens in the repo); `scripts/github-release.mjs` then
pushes the `vX.Y.Z` tag and creates the GitHub release from the changelog. The version then waits in npm's **Staged Packages** tab until a
maintainer reviews it and clicks Approve (2FA), which is the only manual step
and the last line of defense against a compromised workflow.

