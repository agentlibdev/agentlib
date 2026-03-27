import {
  buildAccountPath,
  buildAgentPath,
  buildCreatorPath,
  buildImportDetailPath,
  buildImportNewPath,
  buildManualPublishPath,
  buildVersionPath
} from "./router.js";
import type { RouteMatch } from "./router.js";
import type { AgentListItem, ImportDraftArtifact, ImportDraftRecord } from "./types.js";

export type Breadcrumb = {
  label: string;
  path: string;
};

export type CreatorRank = {
  handle: string;
  agentCount: number;
  totalDownloads: number;
  totalPins: number;
  totalStars: number;
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

export function rankCreators(agents: AgentListItem[]): CreatorRank[] {
  const byCreator = new Map<string, CreatorRank>();

  for (const agent of agents) {
    const existing = byCreator.get(agent.ownerHandle) ?? {
      handle: agent.ownerHandle,
      agentCount: 0,
      totalDownloads: 0,
      totalPins: 0,
      totalStars: 0
    };

    existing.agentCount += 1;
    existing.totalDownloads += agent.downloadCount;
    existing.totalPins += agent.pinCount;
    existing.totalStars += agent.starCount;
    byCreator.set(agent.ownerHandle, existing);
  }

  return [...byCreator.values()].sort((left, right) => {
    const leftScore = left.totalDownloads * 3 + left.totalStars * 2 + left.totalPins;
    const rightScore = right.totalDownloads * 3 + right.totalStars * 2 + right.totalPins;
    return rightScore - leftScore;
  });
}

export function buildBreadcrumbs(route: RouteMatch): Breadcrumb[] {
  if (
    route.name === "home" ||
    route.name === "not-found" ||
    route.name === "import-new"
  ) {
    return [{ label: "Registry", path: "/" }];
  }

  if (route.name === "account") {
    return [
      { label: "Registry", path: "/" },
      { label: "Account", path: buildAccountPath() }
    ];
  }

  if (route.name === "creator") {
    return [
      { label: "Registry", path: "/" },
      { label: route.handle, path: buildCreatorPath(route.handle) }
    ];
  }

  if (route.name === "manual-publish") {
    return [
      { label: "Registry", path: "/" },
      { label: "Manual publish", path: buildManualPublishPath() }
    ];
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
