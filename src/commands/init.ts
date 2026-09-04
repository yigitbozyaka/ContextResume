import { bashHook } from "../shell/bash.js";
import { pwshHook } from "../shell/pwsh.js";
import { zshHook } from "../shell/zsh.js";

export const supportedShells = ["bash", "zsh", "pwsh"] as const;
export type Shell = (typeof supportedShells)[number];

const hooks: Record<Shell, string> = { bash: bashHook, zsh: zshHook, pwsh: pwshHook };

export function shellHook(shell: string): string {
  const hook = hooks[shell as Shell];
  if (!hook)
    throw new Error(`Unsupported shell "${shell}". Use one of: ${supportedShells.join(", ")}.`);
  return hook;
}

export function initCommand(shell: string): void {
  process.stdout.write(shellHook(shell));
}
