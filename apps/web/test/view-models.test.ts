import assert from "node:assert/strict";
import test from "node:test";

import { buildBreadcrumbs, filterAgents } from "../src/lib/view-models.js";
import type { AgentListItem } from "../src/lib/types.js";

const agents: AgentListItem[] = [
  {
    namespace: "raul",
    name: "code-reviewer",
    latestVersion: "0.4.0",
    title: "Code Reviewer",
    description: "Reviews pull requests for correctness and maintainability."
  },
  {
    namespace: "raul",
    name: "docs-writer",
    latestVersion: "0.2.0",
    title: "Docs Writer",
    description: "Produces concise contributor-facing documentation."
  }
];

test("filterAgents matches slug, title, and description text", () => {
  assert.deepEqual(
    filterAgents(agents, "review"),
    [agents[0]]
  );
  assert.deepEqual(
    filterAgents(agents, "docs"),
    [agents[1]]
  );
  assert.deepEqual(
    filterAgents(agents, "contributor"),
    [agents[1]]
  );
});

test("filterAgents returns the full list for an empty query", () => {
  assert.deepEqual(filterAgents(agents, "   "), agents);
});

test("buildBreadcrumbs returns home-only for the registry page", () => {
  assert.deepEqual(buildBreadcrumbs({ name: "home" }), [
    { label: "Registry", path: "/" }
  ]);
});

test("buildBreadcrumbs returns the agent trail for an agent page", () => {
  assert.deepEqual(
    buildBreadcrumbs({
      name: "agent",
      namespace: "raul",
      nameParam: "code-reviewer"
    }),
    [
      { label: "Registry", path: "/" },
      { label: "raul/code-reviewer", path: "/agents/raul/code-reviewer" }
    ]
  );
});

test("buildBreadcrumbs returns the full trail for a version page", () => {
  assert.deepEqual(
    buildBreadcrumbs({
      name: "version",
      namespace: "raul",
      nameParam: "code-reviewer",
      version: "0.4.0"
    }),
    [
      { label: "Registry", path: "/" },
      { label: "raul/code-reviewer", path: "/agents/raul/code-reviewer" },
      { label: "0.4.0", path: "/agents/raul/code-reviewer/versions/0.4.0" }
    ]
  );
});
