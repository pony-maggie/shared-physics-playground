import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("dev scripts", () => {
  it("provides dedicated up/down scripts and documents them in local setup", () => {
    expect(existsSync(join(root, "scripts/dev-up.sh"))).toBe(true);
    expect(existsSync(join(root, "scripts/dev-down.sh"))).toBe(true);
    expect(existsSync(join(root, ".env.example"))).toBe(true);

    const localSetup = readFileSync(join(root, "LOCAL-SETUP.md"), "utf8");

    expect(localSetup).toContain("./scripts/dev-up.sh");
    expect(localSetup).toContain("./scripts/dev-down.sh");
    expect(localSetup).toContain(".env.example");
    expect(localSetup).toContain(".env");
  });
});
