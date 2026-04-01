import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const migrationsDir = join(process.cwd(), "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((entry) => /^\d+.*\.sql$/.test(entry))
  .sort((left, right) => left.localeCompare(right));

if (migrationFiles.length === 0) {
  throw new Error(`No SQL migrations found in ${migrationsDir}`);
}

for (const file of migrationFiles) {
  const migrationPath = join("migrations", file);
  const result = spawnSync(
    "npm",
    [
      "exec",
      "wrangler",
      "--",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      ".wrangler/state",
      "--file",
      migrationPath,
      "--yes"
    ],
    {
      stdio: "inherit",
      shell: false
    }
  );

  if (result.status !== 0) {
    throw new Error(`Failed applying migration ${migrationPath}`);
  }
}
