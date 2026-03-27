import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAccountUrl,
  buildAgentDetailUrl,
  buildGithubImportUrl,
  buildImportDetailUrl,
  buildImportPublishUrl,
  buildAgentVersionUrl,
  buildArtifactsUrl,
  buildPublishUrl,
  buildSessionUrl,
  buildAuthStartUrl,
  buildLogoutUrl,
  buildAgentLifecycleUrl,
  buildAgentMetricActionUrl,
  buildHighlightsUrl
} from "../src/lib/api.js";

test("buildAgentDetailUrl builds the agent detail endpoint", () => {
  assert.equal(
    buildAgentDetailUrl("raul", "code-reviewer"),
    "/api/v1/agents/raul/code-reviewer"
  );
});

test("buildAgentVersionUrl builds the version detail endpoint", () => {
  assert.equal(
    buildAgentVersionUrl("raul", "code-reviewer", "0.4.0"),
    "/api/v1/agents/raul/code-reviewer/versions/0.4.0"
  );
});

test("buildArtifactsUrl builds the artifact listing endpoint", () => {
  assert.equal(
    buildArtifactsUrl("raul", "code-reviewer", "0.4.0"),
    "/api/v1/agents/raul/code-reviewer/versions/0.4.0/artifacts"
  );
});

test("buildGithubImportUrl builds the GitHub import endpoint", () => {
  assert.equal(buildGithubImportUrl(), "/api/v1/providers/github/import");
});

test("buildPublishUrl builds the manual publish endpoint", () => {
  assert.equal(buildPublishUrl(), "/api/v1/publish");
});

test("buildSessionUrl builds the current-session endpoint", () => {
  assert.equal(buildSessionUrl(), "/api/v1/session");
});

test("buildAccountUrl builds the account endpoint", () => {
  assert.equal(buildAccountUrl(), "/api/v1/account");
});

test("buildHighlightsUrl builds the highlights endpoint", () => {
  assert.equal(buildHighlightsUrl(), "/api/v1/highlights");
});

test("buildAuthStartUrl builds the GitHub OAuth start endpoint", () => {
  assert.equal(
    buildAuthStartUrl("github", "/publish/manual"),
    "/api/v1/auth/github/start?redirectTo=%2Fpublish%2Fmanual"
  );
});

test("buildLogoutUrl builds the logout endpoint", () => {
  assert.equal(buildLogoutUrl(), "/api/v1/auth/logout");
});

test("buildImportDetailUrl builds the import detail endpoint", () => {
  assert.equal(
    buildImportDetailUrl("import_draft_github_123"),
    "/api/v1/imports/import_draft_github_123"
  );
});

test("buildImportPublishUrl builds the import publish endpoint", () => {
  assert.equal(
    buildImportPublishUrl("import_draft_github_123"),
    "/api/v1/imports/import_draft_github_123/publish"
  );
});

test("buildAgentLifecycleUrl builds the lifecycle mutation endpoint", () => {
  assert.equal(
    buildAgentLifecycleUrl("raul", "code-reviewer"),
    "/api/v1/agents/raul/code-reviewer"
  );
});

test("buildAgentMetricActionUrl builds metric mutation endpoints", () => {
  assert.equal(
    buildAgentMetricActionUrl("raul", "code-reviewer", "stars"),
    "/api/v1/agents/raul/code-reviewer/stars"
  );
});
