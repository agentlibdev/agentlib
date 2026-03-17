import { waitForHealth } from "./_local-api.mjs";

const namespace = process.argv[2] ?? "raul";
const name = process.argv[3] ?? "code-reviewer";
const version = process.argv[4] ?? "0.3.0";

await waitForHealth();

const response = await fetch(
  `http://127.0.0.1:8787/api/v1/agents/${namespace}/${name}/versions/${version}/artifacts`
);

const body = await response.text();
console.log(body);
process.exitCode = response.ok ? 0 : 1;
