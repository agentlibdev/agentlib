import assert from "node:assert/strict";
import test from "node:test";

import { canPublishImportDraft, sortImportArtifacts } from "../src/lib/view-models.js";
import type { ImportDraftResponse } from "../src/lib/types.js";

const draft: ImportDraftResponse = {
  import: {
    id: "import_draft_github_123",
    status: "draft",
    provider: "github",
    repository: {
      externalId: "github:agentlibdev/agentlib",
      url: "https://github.com/agentlibdev/agentlib",
      owner: "agentlibdev",
      name: "agentlib",
      defaultBranch: "main",
      resolvedRef: "main"
    },
    manifest: {
      namespace: "raul",
      name: "code-reviewer",
      version: "0.4.0",
      title: "Code Reviewer",
      description: "Reviews code changes."
    },
    readme: "# Code Reviewer",
    artifacts: [
      { path: "README.md", mediaType: "text/markdown", sizeBytes: 120 },
      { path: "agent.yaml", mediaType: "application/yaml", sizeBytes: 80 },
      { path: "LICENSE", mediaType: "text/plain", sizeBytes: 20 }
    ],
    sourceRepositoryId: "source_repo_github_agentlibdev_agentlib"
  }
};

test("import draft publish is allowed only while status is draft", () => {
  assert.equal(canPublishImportDraft(draft.import), true);
  assert.equal(canPublishImportDraft({ ...draft.import, status: "published" }), false);
});

test("import draft artifacts are sorted by canonical path order", () => {
  assert.deepEqual(sortImportArtifacts(draft.import), [
    draft.import.artifacts[1],
    draft.import.artifacts[0],
    draft.import.artifacts[2]
  ]);
});
