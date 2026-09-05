---
"context-resume": patch
---

Fix the built CLI failing to start with "Cannot find module '../../package.json'" after the MCP server was added; the version is now read from one module and CI smoke-tests the bundle.
