import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

const databaseDirectory = mkdtempSync(join(tmpdir(), "stamp-inventory-test-"));
process.env.DATABASE_URL = `file:${join(databaseDirectory, "test.db")}`;

execFileSync("pnpm", ["db:init"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "pipe",
});

afterAll(() => {
  rmSync(databaseDirectory, { recursive: true, force: true });
});
