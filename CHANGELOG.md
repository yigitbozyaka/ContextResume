# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Repository bootstrap: TypeScript toolchain, CI, contribution guidelines, and architecture docs.
- `ctxr pause`, `ctxr resume`, and `ctxr list` with a local snapshot store, git sensor, heuristic summary, base-branch comparison, and secret scrubbing.
- `ctxr init bash|zsh|pwsh` shell hooks: per-command log with exit codes and automatic pause/resume on branch change.
- `ctxr run` captures command output; the card shows the last unresolved failing command with the parsed error location for Jest, Vitest, pytest, go test, and cargo test.
- Rerun the failing command straight from the resume card.
