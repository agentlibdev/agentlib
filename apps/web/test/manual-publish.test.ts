import assert from "node:assert/strict";
import test from "node:test";

import { buildManualPublishRequest } from "../src/lib/manual-publish.js";

test("buildManualPublishRequest assembles manifest, readme, and uploaded artifacts", async () => {
  const payload = await buildManualPublishRequest(
    {
      namespace: "raul",
      name: "code-reviewer",
      version: "0.5.0",
      title: "Code Reviewer",
      description: "Reviews pull requests for correctness and maintainability.",
      license: "MIT",
      summary: "Reviews pull requests with a focus on correctness and maintainability.",
      readme: "# Code Reviewer\n"
    },
    [
      new File(["apiVersion: agentlib.dev/v1alpha1\n"], "agent.yaml", {
        type: "application/yaml"
      }),
      new File(["# Code Reviewer\n"], "README.md", {
        type: "text/markdown"
      })
    ]
  );

  assert.deepEqual(payload.manifest, {
    apiVersion: "agentlib.dev/v1alpha1",
    kind: "Agent",
    metadata: {
      namespace: "raul",
      name: "code-reviewer",
      version: "0.5.0",
      title: "Code Reviewer",
      description: "Reviews pull requests for correctness and maintainability.",
      license: "MIT"
    },
    spec: {
      summary: "Reviews pull requests with a focus on correctness and maintainability.",
      inputs: [],
      outputs: [],
      tools: []
    }
  });

  assert.equal(payload.readme, "# Code Reviewer\n");
  assert.deepEqual(payload.artifacts, [
    {
      path: "agent.yaml",
      mediaType: "application/yaml",
      content: Buffer.from("apiVersion: agentlib.dev/v1alpha1\n").toString("base64")
    },
    {
      path: "README.md",
      mediaType: "text/markdown",
      content: Buffer.from("# Code Reviewer\n").toString("base64")
    }
  ]);
});
