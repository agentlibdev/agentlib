import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import YAML from "yaml";

const examplePath = process.argv[2];

if (!examplePath) {
  console.error("Usage: npm run publish:example:local -- /absolute/or/relative/example-dir");
  process.exit(1);
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:8787/health");
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

async function readOptional(path) {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

const root = resolve(process.cwd(), "..", "..", examplePath);
const manifestRaw = await readFile(resolve(root, "agent.yaml"), "utf8");
const manifest = YAML.parse(manifestRaw);
const readmeRaw = await readFile(resolve(root, "README.md"), "utf8");
const agentMdRaw = await readOptional(resolve(root, "agent.md"));
const licenseRaw = await readOptional(resolve(root, "LICENSE"));

const artifacts = [
  {
    path: "agent.yaml",
    mediaType: "application/yaml",
    content: Buffer.from(manifestRaw).toString("base64")
  },
  {
    path: "README.md",
    mediaType: "text/markdown",
    content: Buffer.from(readmeRaw).toString("base64")
  }
];

if (agentMdRaw) {
  artifacts.push({
    path: "agent.md",
    mediaType: "text/markdown",
    content: agentMdRaw.toString("base64")
  });
}

if (licenseRaw) {
  artifacts.push({
    path: "LICENSE",
    mediaType: "text/plain",
    content: licenseRaw.toString("base64")
  });
}

await waitForHealth();

const response = await fetch("http://127.0.0.1:8787/api/v1/publish", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    manifest,
    readme: readmeRaw,
    artifacts
  })
});

const body = await response.text();
console.log(
  JSON.stringify(
    {
      example: basename(root),
      status: response.status,
      body: body ? JSON.parse(body) : null
    },
    null,
    2
  )
);
process.exitCode = response.ok ? 0 : 1;
