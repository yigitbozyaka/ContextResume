import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

for (const file of ["plugin/.claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  if (manifest.version) manifest.version = version;
  if (manifest.metadata?.version) manifest.metadata.version = version;
  for (const plugin of manifest.plugins ?? []) plugin.version = version;
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`plugin manifests set to ${version}`);
