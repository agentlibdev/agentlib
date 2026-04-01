import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAccountPath,
  buildArtifactPath,
  buildCreatorPath,
  buildImportDetailPath,
  buildImportNewPath,
  buildManualPublishPath,
  matchRoute
} from "../src/lib/router.js";

test("matchRoute resolves the home page", () => {
  assert.deepEqual(matchRoute("/"), {
    name: "home"
  });
});

test("matchRoute resolves an agent detail page", () => {
  assert.deepEqual(matchRoute("/agents/raul/code-reviewer"), {
    name: "agent",
    namespace: "raul",
    nameParam: "code-reviewer"
  });
});

test("matchRoute resolves an agent version page", () => {
  assert.deepEqual(matchRoute("/agents/raul/code-reviewer/versions/0.4.0"), {
    name: "version",
    namespace: "raul",
    nameParam: "code-reviewer",
    version: "0.4.0"
  });
});

test("matchRoute resolves an artifact viewer page", () => {
  assert.deepEqual(
    matchRoute("/agents/raul/code-reviewer/versions/0.4.0/artifacts/README.md/view"),
    {
      name: "artifact",
      namespace: "raul",
      nameParam: "code-reviewer",
      version: "0.4.0",
      artifactPath: "README.md"
    }
  );
});

test("matchRoute resolves the import creation page", () => {
  assert.deepEqual(matchRoute("/imports/new"), {
    name: "import-new"
  });
});

test("matchRoute resolves the manual publish page", () => {
  assert.deepEqual(matchRoute("/publish/manual"), {
    name: "manual-publish"
  });
});

test("matchRoute resolves the account page", () => {
  assert.deepEqual(matchRoute("/account"), {
    name: "account"
  });
});

test("matchRoute resolves a creator page", () => {
  assert.deepEqual(matchRoute("/creators/raul"), {
    name: "creator",
    handle: "raul"
  });
});

test("matchRoute resolves an import draft page", () => {
  assert.deepEqual(matchRoute("/imports/import_draft_github_123"), {
    name: "import-detail",
    importId: "import_draft_github_123"
  });
});

test("buildImportNewPath builds the import creation path", () => {
  assert.equal(buildImportNewPath(), "/imports/new");
});

test("buildImportDetailPath builds the import detail path", () => {
  assert.equal(buildImportDetailPath("import_draft_github_123"), "/imports/import_draft_github_123");
});

test("buildManualPublishPath builds the manual publish path", () => {
  assert.equal(buildManualPublishPath(), "/publish/manual");
});

test("buildAccountPath builds the account path", () => {
  assert.equal(buildAccountPath(), "/account");
});

test("buildCreatorPath builds the creator path", () => {
  assert.equal(buildCreatorPath("raul"), "/creators/raul");
});

test("buildArtifactPath builds the artifact viewer path", () => {
  assert.equal(
    buildArtifactPath("raul", "code-reviewer", "0.4.0", "README.md"),
    "/agents/raul/code-reviewer/versions/0.4.0/artifacts/README.md/view"
  );
});

test("matchRoute returns not-found for unknown paths", () => {
  assert.deepEqual(matchRoute("/missing"), {
    name: "not-found"
  });
});
