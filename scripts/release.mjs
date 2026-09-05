import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));
const spec = `${name}@${version}`;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const published = spawnSync(npm, ["view", spec, "version"], { encoding: "utf8" }).stdout.trim();
if (published === version) {
  console.log(`${spec} is already on the registry, skipping stage`);
} else {
  const stage = spawnSync(npm, ["stage", "publish", "--provenance", "--access", "public"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(stage.stdout);
  if (stage.status !== 0) {
    if (/E409|previously published|already staged/i.test(stage.stderr)) {
      console.log(`${spec} is already staged, skipping`);
    } else {
      process.stderr.write(stage.stderr);
      process.exit(stage.status ?? 1);
    }
  }
}

execFileSync(process.execPath, ["scripts/github-release.mjs"], { stdio: "inherit" });
