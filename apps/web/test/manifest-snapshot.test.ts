import assert from "node:assert/strict";
import test from "node:test";

import { buildManifestSnapshotViewModel } from "../src/lib/manifest-snapshot.js";

test("buildManifestSnapshotViewModel extracts key manifest fields and pretty-prints JSON", () => {
  const viewModel = buildManifestSnapshotViewModel(
    JSON.stringify({
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      metadata: {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.5.0",
        title: "Code Reviewer",
        description: "Reviews pull requests."
      },
      spec: {
        summary: "Reviews pull requests with a focus on maintainability."
      }
    })
  );

  assert.deepEqual(
    {
      apiVersion: viewModel.apiVersion,
      kind: viewModel.kind,
      namespace: viewModel.namespace,
      name: viewModel.name,
      version: viewModel.version,
      title: viewModel.title,
      description: viewModel.description,
      summary: viewModel.summary
    },
    {
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      namespace: "raul",
      name: "code-reviewer",
      version: "0.5.0",
      title: "Code Reviewer",
      description: "Reviews pull requests.",
      summary: "Reviews pull requests with a focus on maintainability."
    }
  );
  assert.match(viewModel.formattedJson, /\n  "metadata": \{/);
});

test("buildManifestSnapshotViewModel falls back to raw text for invalid JSON", () => {
  const viewModel = buildManifestSnapshotViewModel("{not-json");

  assert.equal(viewModel.formattedJson, "{not-json");
  assert.equal(viewModel.kind, null);
  assert.equal(viewModel.summary, null);
});
