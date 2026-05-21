import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

const CLI = "tsx src/main.ts";
const DUMMY_KEY = ("0x" + "a".repeat(64)) as string;

function run(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI} ${args}`, {
      encoding: "utf-8",
      timeout: 10000,
      env: {
        ...process.env,
        SOURCE_PRIVATE_KEY: DUMMY_KEY,
        SPONSOR_PRIVATE_KEY: DUMMY_KEY,
      },
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: e.status ?? 1,
    };
  }
}

describe("CLI E2E", () => {
  it("prints help with --help", () => {
    const { stdout, exitCode } = run("--help");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("eip7702");
    expect(stdout).toContain("revoke");
    expect(stdout).toContain("delegate");
    expect(stdout).toContain("--help");
  });

  it("prints version with --version", () => {
    const { stdout, exitCode } = run("--version");
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("shows revoke subcommand help", () => {
    const { stdout, exitCode } = run("revoke --help");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("revoke");
    expect(stdout).toContain("--network");
    expect(stdout).toContain("--dry-run");
  });

  it("shows delegate subcommand help", () => {
    const { stdout, exitCode } = run("delegate --help");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("delegate");
    expect(stdout).toContain("--to");
  });

  it("fails with no arguments", () => {
    const { stdout, stderr, exitCode } = run("");
    expect(exitCode).toBe(1);
    const output = stdout + stderr;
    expect(output).toContain("help");
  });
});
