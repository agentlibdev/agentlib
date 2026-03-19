import { waitForHealth } from "./_local-api.mjs";

const repositoryUrl = process.argv[2];
const ref = process.argv[3];

if (!repositoryUrl) {
  console.error("Usage: npm run import:github:local -- <repository-url> [ref]");
  process.exit(1);
}

await waitForHealth();

const payload = { repositoryUrl };

if (ref) {
  payload.ref = ref;
}

const response = await fetch("http://127.0.0.1:8787/api/v1/providers/github/import", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify(payload)
});

const body = await response.text();
console.log(body);
process.exitCode = response.ok ? 0 : 1;
