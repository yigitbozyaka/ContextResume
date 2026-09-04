const secretPatterns: RegExp[] = [
  /AKIA[0-9A-Z]{16}/g,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /github_pat_[A-Za-z0-9_]{30,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const assignmentPattern =
  /\b([A-Za-z0-9_]*?(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIALS?))(\s*[=:]\s*)(["']?)([^\s"',;]+)\3/gi;

const bearerPattern = /\b(Bearer\s+)[A-Za-z0-9._~+/-]{16,}=*/gi;

export const redacted = "[REDACTED]";

export function scrubSecrets(text: string): string {
  let out = text;
  for (const pattern of secretPatterns) out = out.replace(pattern, redacted);
  out = out.replace(assignmentPattern, `$1$2$3${redacted}$3`);
  out = out.replace(bearerPattern, `$1${redacted}`);
  return out;
}
