import { basename } from "node:path";

import { buildLocalExamplePublishPayload } from "../packages/core/src/local-example-publish.js";

async function waitForHealth(baseUrl = "http://127.0.0.1:8787") {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(250)
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Local API did not become ready in time");
}

const examplePath = process.argv[2];

if (!examplePath) {
  console.error("Usage: npm run publish:example:local -- /absolute/or/relative/example-dir");
  process.exit(1);
}

await waitForHealth();

const payload = await buildLocalExamplePublishPayload(examplePath);
const response = await fetch("http://127.0.0.1:8787/api/v1/publish", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify(payload)
});

const body = await response.text();
console.log(
  JSON.stringify(
    {
      example: basename(examplePath),
      status: response.status,
      body: body ? JSON.parse(body) : null
    },
    null,
    2
  )
);
process.exitCode = response.ok ? 0 : 1;
