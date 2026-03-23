import assert from "node:assert/strict";
import test from "node:test";

import { buildImportDetailPath, buildImportNewPath, matchRoute } from "../src/lib/router.js";

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

test("matchRoute resolves the import creation page", () => {
  assert.deepEqual(matchRoute("/imports/new"), {
    name: "import-new"
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

test("matchRoute returns not-found for unknown paths", () => {
  assert.deepEqual(matchRoute("/missing"), {
    name: "not-found"
  });
});
