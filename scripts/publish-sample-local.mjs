import { waitForHealth } from "./_local-api.mjs";
import { createSamplePublishRequest } from "./sample-publish-request.mjs";

const version = process.argv[2] ?? "0.3.0";

await waitForHealth();

const response = await fetch("http://127.0.0.1:8787/api/v1/publish", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify(createSamplePublishRequest(version))
});

const body = await response.text();
console.log(body);
process.exitCode = response.ok ? 0 : 1;
