import { buildAgentPath, buildVersionPath } from "./router.js";
import type { AgentListItem } from "./types.js";

type RouteMatch =
  | { name: "home" }
  | { name: "agent"; namespace: string; nameParam: string }
  | { name: "version"; namespace: string; nameParam: string; version: string }
  | { name: "not-found" };

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
  if (route.name === "home" || route.name === "not-found") {
    return [{ label: "Registry", path: "/" }];
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
