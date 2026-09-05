import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const tag = `v${version}`;
const run = (cmd, args) =>
  execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"] })
    .toString()
    .trim();

const changelog = readFileSync("CHANGELOG.md", "utf8");
const section = changelog.split(/^## /m).find((s) => s.startsWith(`${version}\n`));
const notes = section ? section.slice(section.indexOf("\n") + 1).trim() : `Release ${tag}.`;
const staged = `${notes}\n\nThe npm package is staged and goes live once a maintainer approves it on npmjs.com.`;

if (!run("git", ["tag", "--list", tag])) {
  run("git", ["tag", tag]);
  run("git", ["push", "origin", tag]);
  console.log(`pushed tag ${tag}`);
}

const exists = (() => {
  try {
    run("gh", ["release", "view", tag]);
    return true;
  } catch {
    return false;
  }
})();

if (!exists) {
  const prerelease = version.startsWith("0.") ? ["--prerelease"] : [];
  run("gh", ["release", "create", tag, "--title", tag, "--notes", staged, ...prerelease]);
  console.log(`created release ${tag}`);
}
