import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "../src/mcp/server.js";
import { createRepo, type TestRepo } from "./helpers/repo.js";

let ctxrHome: string;
let repo: TestRepo;
let client: Client;

beforeEach(async () => {
  ctxrHome = await mkdtemp(join(tmpdir(), "ctxr-mcp-"));
  process.env.CTXR_HOME = ctxrHome;
  repo = await createRepo();
  const server = createMcpServer(repo.dir);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "ctxr-test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterEach(async () => {
  await client.close();
  delete process.env.CTXR_HOME;
  await repo.cleanup();
  try {
    await rm(ctxrHome, { recursive: true, force: true });
  } catch {}
});

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  const blocks = result.content as { type: string; text?: string }[];
  return { text: blocks.map((block) => block.text ?? "").join(""), isError: result.isError };
}

describe("mcp server", () => {
  it("exposes the three context tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_context",
      "list_snapshots",
      "save_snapshot",
    ]);
  });

  it("saves a snapshot and reads it back as markdown", async () => {
    const saved = await callTool("save_snapshot", { note: "wiring the mcp server" });
    expect(saved.isError).toBeFalsy();
    expect(saved.text).toContain("Saved main in");

    const context = await callTool("get_context");
    expect(context.isError).toBeFalsy();
    expect(context.text).toContain("wiring the mcp server");
    expect(context.text).toContain("main");
  });

  it("lists the snapshots of the current repository as JSON", async () => {
    await callTool("save_snapshot", { note: "wiring the mcp server" });
    const listed = await callTool("list_snapshots");
    const entries = JSON.parse(listed.text) as { branch: string }[];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.branch).toBe("main");
  });

  it("reports an error when the repo is not a git checkout", async () => {
    const plain = await mkdtemp(join(tmpdir(), "ctxr-plain-"));
    const result = await callTool("get_context", { repo: plain });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("Not inside a git repository.");
    try {
      await rm(plain, { recursive: true, force: true });
    } catch {}
  });

  it("explains that a branch has no snapshot yet", async () => {
    const result = await callTool("get_context", { branch: "missing" });
    expect(result.isError).toBe(false);
    expect(result.text).toContain("No snapshot for missing");
    expect(result.text).toContain("ctxr pause");
  });
});
