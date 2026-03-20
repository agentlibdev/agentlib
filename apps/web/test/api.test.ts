import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentDetailUrl,
  buildAgentVersionUrl,
  buildArtifactsUrl
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
