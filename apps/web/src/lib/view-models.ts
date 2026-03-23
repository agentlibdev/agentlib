import { buildAgentPath, buildImportDetailPath, buildImportNewPath, buildVersionPath } from "./router.js";
import type { RouteMatch } from "./router.js";
import type { AgentListItem, ImportDraftArtifact, ImportDraftRecord } from "./types.js";

export type Breadcrumb = {
  label: string;
  path: string;
};

export function filterAgents(agents: AgentListItem[], query: string): AgentListItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return agents;
  }

  return agents.filter((agent) =>
    [
      `${agent.namespace}/${agent.name}`,
      agent.title,
      agent.description
    ].some((field) => field.toLowerCase().includes(normalizedQuery))
  );
}

export function buildBreadcrumbs(route: RouteMatch): Breadcrumb[] {
  if (route.name === "home" || route.name === "not-found" || route.name === "import-new") {
    return [{ label: "Registry", path: "/" }];
  }

  if (route.name === "import-detail") {
    return [
      { label: "Registry", path: "/" },
      { label: "Imports", path: buildImportNewPath() },
      { label: route.importId, path: buildImportDetailPath(route.importId) }
    ];
  }

  const agentLabel = `${route.namespace}/${route.nameParam}`;
  const agentPath = buildAgentPath(route.namespace, route.nameParam);

  if (route.name === "agent") {
    return [
      { label: "Registry", path: "/" },
      { label: agentLabel, path: agentPath }
    ];
  }

  return [
    { label: "Registry", path: "/" },
    { label: agentLabel, path: agentPath },
    { label: route.version, path: buildVersionPath(route.namespace, route.nameParam, route.version) }
  ];
}

export function canPublishImportDraft(draft: ImportDraftRecord): boolean {
  return draft.status === "draft";
}

export function sortImportArtifacts(draft: ImportDraftRecord): ImportDraftArtifact[] {
  const canonicalOrder = ["agent.yaml", "README.md", "agent.md", "LICENSE"];

  return [...draft.artifacts].sort((left, right) => {
    const leftIndex = canonicalOrder.indexOf(left.path);
    const rightIndex = canonicalOrder.indexOf(right.path);

    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    }

    return left.path.localeCompare(right.path);
  });
}
