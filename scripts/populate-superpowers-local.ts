import { buildLocalRepositoryPublishPayload } from "../packages/core/src/local-repository-publish.js";
import { waitForHealth } from "./_local-api.js";
import {
  buildSuperpowersDemoHeaders,
  resolveSuperpowersVersion,
  superpowersCompatibility
} from "./_superpowers-demo.js";

const repoPath = process.argv[2];
const version = resolveSuperpowersVersion(process.argv[3]);
const baseUrl = "http://127.0.0.1:8787";

if (!repoPath) {
  console.error(
    "Usage: npm run demo:populate:superpowers:local -- /absolute/or/relative/superpowers-repo [version]"
  );
  process.exit(1);
}

await waitForHealth(baseUrl);

const payload = await buildLocalRepositoryPublishPayload(repoPath, {
  namespace: "obra",
  name: "superpowers",
  version,
  title: "Superpowers",
  description: "Open skills system and reusable instruction repository.",
  packageKind: "repository-snapshot",
  compatibility: superpowersCompatibility
});

const response = await fetch(`${baseUrl}/api/v1/publish`, {
  method: "POST",
  headers: buildSuperpowersDemoHeaders(),
  body: JSON.stringify(payload)
});

const body = await response.text();
let parsedBody;

try {
  parsedBody = body ? JSON.parse(body) : null;
} catch {
  parsedBody = body;
}

if (!response.ok) {
  if (
    parsedBody &&
    typeof parsedBody === "object" &&
    parsedBody !== null &&
    "error" in parsedBody &&
    parsedBody.error &&
    typeof parsedBody.error === "object" &&
    parsedBody.error !== null &&
    "code" in parsedBody.error &&
    parsedBody.error.code === "version_exists"
  ) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: "version_exists",
          package: "obra/superpowers",
          version
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.error(body);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      package: "obra/superpowers",
      version,
      artifactCount: payload.artifacts.length,
      response: parsedBody
    },
    null,
    2
  )
);
