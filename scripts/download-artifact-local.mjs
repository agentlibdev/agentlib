import { writeFile } from "node:fs/promises";

import { waitForHealth } from "./_local-api.mjs";

const namespace = process.argv[2] ?? "raul";
const name = process.argv[3] ?? "code-reviewer";
const version = process.argv[4] ?? "0.3.0";
const path = process.argv[5] ?? "README.md";
const outputPath = process.argv[6];

await waitForHealth();

const response = await fetch(
  `http://127.0.0.1:8787/api/v1/agents/${namespace}/${name}/versions/${version}/artifacts/${encodeURIComponent(path)}`
);

if (!response.ok) {
  console.log(await response.text());
  process.exitCode = 1;
} else if (outputPath) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(outputPath, bytes);
  console.log(outputPath);
} else {
  console.log(await response.text());
}
