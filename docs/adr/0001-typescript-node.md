# ADR 0001: TypeScript on Node

Status: accepted. Date: 2026-09-05.

## Context

The CLI must install with one command on macOS, Linux, and Windows, ship a Claude Code
plugin and an MCP server, and be easy for contributors to pick up. Startup time matters
only for the shell prompt hook, which runs on every prompt.

## Decision

TypeScript compiled with tsup to a single ESM bundle, published to npm, Node >= 20.
The prompt hook is pure shell and only invokes Node when the branch changed, so Node's
startup cost is paid once per branch switch rather than once per prompt.

## Consequences

- `npx context-resume` and `npm i -g context-resume` work everywhere Node does.
- The MCP SDK and Claude Code plugin ecosystem are TypeScript-first.
- A Go or Rust rewrite of the hot path is possible later if the hook ever needs Node
  on every prompt; nothing in the storage format depends on the runtime.
