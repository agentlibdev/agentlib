import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentSummaryItems,
  buildBreadcrumbs,
  buildRegistryStatItems,
  buildVersionSidebarSections,
  buildVersionTabItems,
  filterAgents
} from "../src/lib/view-models.js";
import type {
  AgentDetailResponse,
  AgentListItem,
  AgentVersionDetailResponse,
  RegistryHighlightsResponse
} from "../src/lib/types.js";

const agents: AgentListItem[] = [
  {
    namespace: "raul",
    name: "code-reviewer",
    packageKind: "agent",
    latestVersion: "0.4.0",
    title: "Code Reviewer",
    description: "Reviews pull requests for correctness and maintainability.",
    lifecycleStatus: "active",
    ownerHandle: "raul",
    downloadCount: 0,
    pinCount: 0,
    starCount: 0
  },
  {
    namespace: "raul",
    name: "docs-writer",
    packageKind: "agent",
    latestVersion: "0.2.0",
    title: "Docs Writer",
    description: "Produces concise contributor-facing documentation.",
    lifecycleStatus: "active",
    ownerHandle: "raul",
    downloadCount: 0,
    pinCount: 0,
    starCount: 0
  }
];

const highlights: RegistryHighlightsResponse = {
  highlights: {
    stats: {
      totalAgents: 12,
      totalDownloads: 3400,
      totalPins: 28,
      totalStars: 51
    },
    topAgents: []
  }
};

const agentDetail: AgentDetailResponse = {
  agent: {
    namespace: "raul",
    name: "code-reviewer",
    packageKind: "agent",
    latestVersion: "0.4.0",
    lifecycleStatus: "active",
    ownerHandle: "raul",
    provenance: {
      sourceType: "manual",
      sourceUrl: null,
      sourceRepositoryUrl: "https://github.com/raul/code-reviewer",
      originalAuthorHandle: "raul",
      originalAuthorName: "Raul",
      originalAuthorUrl: "https://raul.dev/code-reviewer",
      submittedByHandle: "raul",
      submittedByName: "Raul"
    },
    compatibility: {
      targets: [
        {
          targetId: "codex",
          builtFor: true,
          tested: true,
          adapterAvailable: true
        }
      ]
    },
    downloadCount: 340,
    pinCount: 9,
    starCount: 14,
    viewer: {
      hasPinned: false,
      hasStarred: true
    }
  },
  versions: [
    {
      version: "0.4.0",
      title: "Code Reviewer",
      description: "Reviews pull requests for correctness and maintainability.",
      publishedAt: "2026-03-29T10:00:00.000Z"
    }
  ]
};

const versionDetail: AgentVersionDetailResponse = {
  version: {
    namespace: "raul",
    name: "code-reviewer",
    packageKind: "agent",
    version: "0.4.0",
    title: "Code Reviewer",
    description: "Reviews pull requests for correctness and maintainability.",
    license: "MIT",
    manifestJson: "{\"kind\":\"Agent\"}",
    publishedAt: "2026-03-29T10:00:00.000Z",
    lifecycleStatus: "active",
    ownerHandle: "raul",
    provenance: {
      sourceType: "manual",
      sourceUrl: null,
      sourceRepositoryUrl: "https://github.com/raul/code-reviewer",
      originalAuthorHandle: "raul",
      originalAuthorName: "Raul",
      originalAuthorUrl: "https://raul.dev/code-reviewer",
      submittedByHandle: "raul",
      submittedByName: "Raul"
    },
    compatibility: {
      targets: [
        {
          targetId: "codex",
          builtFor: true,
          tested: true,
          adapterAvailable: true
        }
      ]
    }
  }
};

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

test("buildRegistryStatItems formats the catalog signal strip", () => {
  assert.deepEqual(buildRegistryStatItems(highlights), [
    { label: "Agents", value: "12" },
    { label: "Downloads", value: "3400" },
    { label: "Pins", value: "28" },
    { label: "Stars", value: "51" }
  ]);
});

test("buildAgentSummaryItems returns package-style summary metadata", () => {
  assert.deepEqual(buildAgentSummaryItems(agentDetail), [
    { label: "Latest", value: "0.4.0" },
    { label: "Owner", value: "raul" },
    { label: "Status", value: "active" },
    { label: "Downloads", value: "340" },
    { label: "Stars", value: "14" },
    { label: "Pins", value: "9" }
  ]);
});

test("buildVersionTabItems exposes readme-first package tabs", () => {
  assert.deepEqual(buildVersionTabItems(3), [
    { label: "Readme", href: "#readme", isActive: true },
    { label: "Manifest", href: "#manifest", isActive: false },
    { label: "Artifacts 3", href: "#artifacts", isActive: false },
    { label: "Versions", href: "#versions", isActive: false }
  ]);
});

test("buildVersionSidebarSections adapts package metadata into a technical sidebar", () => {
  assert.deepEqual(buildVersionSidebarSections(versionDetail, 3), [
    {
      heading: "Install",
      value: "agentlib show raul/code-reviewer@0.4.0"
    },
    {
      heading: "Version",
      value: "0.4.0"
    },
    {
      heading: "License",
      value: "MIT"
    },
    {
      heading: "Published",
      value: "2026-03-29T10:00:00.000Z"
    },
    {
      heading: "Owner",
      value: "raul"
    },
    {
      heading: "Artifacts",
      value: "3 files"
    }
  ]);
});
