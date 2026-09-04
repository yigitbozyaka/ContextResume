import { describe, expect, it } from "vitest";
import { redacted, scrubSecrets } from "../src/store/scrub.js";

describe("scrubSecrets", () => {
  it("redacts an AWS access key", () => {
    expect(scrubSecrets("key is AKIAIOSFODNN7EXAMPLE done")).toBe(`key is ${redacted} done`);
  });

  it("redacts a GitHub token", () => {
    const token = `ghp_${"a".repeat(36)}`;
    expect(scrubSecrets(`token=${token}`)).toBe(`token=${redacted}`);
  });

  it("redacts an OpenAI-style key", () => {
    const key = `sk-${"A".repeat(25)}`;
    expect(scrubSecrets(`using ${key} now`)).toBe(`using ${redacted} now`);
  });

  it("redacts a JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(scrubSecrets(`Authorization: ${jwt}`)).toBe(`Authorization: ${redacted}`);
  });

  it("redacts a Bearer header", () => {
    expect(scrubSecrets("Bearer abcdefghij1234567890ABCDEFG")).toBe(`Bearer ${redacted}`);
  });

  it("redacts an API_KEY assignment while keeping the key name", () => {
    expect(scrubSecrets("API_KEY=abc123def")).toBe(`API_KEY=${redacted}`);
  });

  it("redacts a quoted DB_PASSWORD assignment while keeping the key name", () => {
    expect(scrubSecrets('DB_PASSWORD: "hunter2"')).toBe(`DB_PASSWORD: "${redacted}"`);
  });

  it("redacts a PEM private key block", () => {
    const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAK\n-----END RSA PRIVATE KEY-----";
    expect(scrubSecrets(pem)).toBe(redacted);
  });

  it("leaves an ordinary pnpm test command untouched", () => {
    const text = "pnpm test tests/auth.test.ts";
    expect(scrubSecrets(text)).toBe(text);
  });

  it("leaves a jwt expiry error message untouched", () => {
    const text = "TokenExpiredError: jwt expired at auth.ts:42";
    expect(scrubSecrets(text)).toBe(text);
  });

  it("leaves a file named keyboard.ts untouched", () => {
    const text = "keyboard.ts";
    expect(scrubSecrets(text)).toBe(text);
  });
});
