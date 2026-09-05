import pc from "picocolors";
import { buildProgram } from "./program.js";

buildProgram()
  .parseAsync(process.argv)
  .catch((error: unknown) => {
    if (process.argv.includes("--auto")) return;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${pc.red("error")} ${message}`);
    process.exitCode = 1;
  });
