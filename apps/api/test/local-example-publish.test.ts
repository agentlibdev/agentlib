import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildLocalExamplePublishPayload } from "../../../packages/core/src/local-example-publish.js";

test("buildLocalExamplePublishPayload reads canonical example files and optional artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "agentlib-example-"));
  const exampleDir = join(root, "examples", "raul", "code-reviewer");
  await mkdir(exampleDir, { recursive: true });

  const manifestRaw = `apiVersion: agentlib.dev/v1alpha1
kind: Agent
metadata:
  namespace: raul
  name: code-reviewer
  version: 0.4.0
  title: Code Reviewer
  description: Reviews pull requests.
spec:
  summary: Reviews pull requests.
  inputs: []
  outputs: []
  tools: []
`;

  await writeFile(join(exampleDir, "agent.yaml"), manifestRaw, "utf8");
  await writeFile(join(exampleDir, "README.md"), "# Code Reviewer\n", "utf8");
  await writeFile(join(exampleDir, "agent.md"), "You are Code Reviewer.\n", "utf8");
  await writeFile(join(exampleDir, "LICENSE"), "MIT\n", "utf8");

  const payload = await buildLocalExamplePublishPayload(exampleDir);

  assert.equal(payload.manifest.metadata.namespace, "raul");
  assert.equal(payload.manifest.metadata.name, "code-reviewer");
  assert.equal(payload.manifest.metadata.version, "0.4.0");
  assert.equal(payload.readme, "# Code Reviewer\n");
  assert.deepEqual(
    payload.artifacts.map((artifact) => ({
      path: artifact.path,
      mediaType: artifact.mediaType,
      content: Buffer.from(artifact.content, "base64").toString("utf8")
    })),
    [
      {
        path: "agent.yaml",
        mediaType: "application/yaml",
        content: manifestRaw
      },
      {
        path: "README.md",
        mediaType: "text/markdown",
        content: "# Code Reviewer\n"
      },
      {
        path: "agent.md",
        mediaType: "text/markdown",
        content: "You are Code Reviewer.\n"
      },
      {
        path: "LICENSE",
        mediaType: "text/plain",
        content: "MIT\n"
      }
    ]
  );
});

test("buildLocalExamplePublishPayload omits optional files when absent", async () => {
  const root = await mkdtemp(join(tmpdir(), "agentlib-example-"));
  const exampleDir = join(root, "examples", "raul", "docs-writer");
  await mkdir(exampleDir, { recursive: true });

  await writeFile(
    join(exampleDir, "agent.yaml"),
    `apiVersion: agentlib.dev/v1alpha1
kind: Agent
metadata:
  namespace: raul
  name: docs-writer
  version: 0.1.0
  title: Docs Writer
  description: Writes docs.
spec:
  summary: Writes docs.
  inputs: []
  outputs: []
  tools: []
`,
    "utf8"
  );
  await writeFile(join(exampleDir, "README.md"), "# Docs Writer\n", "utf8");

  const payload = await buildLocalExamplePublishPayload(exampleDir);

  assert.deepEqual(
    payload.artifacts.map((artifact) => artifact.path),
    ["agent.yaml", "README.md"]
  );
});
