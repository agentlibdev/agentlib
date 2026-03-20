export type RouteMatch =
  | { name: "home" }
  | { name: "agent"; namespace: string; nameParam: string }
  | { name: "version"; namespace: string; nameParam: string; version: string }
  | { name: "not-found" };

export function matchRoute(pathname: string): RouteMatch {
  if (pathname === "/") {
    return { name: "home" };
  }

  const versionMatch = pathname.match(
    /^\/agents\/([^/]+)\/([^/]+)\/versions\/([^/]+)$/
  );
  if (versionMatch) {
    const [, namespace, nameParam, version] = versionMatch;
    return { name: "version", namespace, nameParam, version };
  }

  const agentMatch = pathname.match(/^\/agents\/([^/]+)\/([^/]+)$/);
  if (agentMatch) {
    const [, namespace, nameParam] = agentMatch;
    return { name: "agent", namespace, nameParam };
  }

  return { name: "not-found" };
}

export function buildAgentPath(namespace: string, name: string): string {
  return `/agents/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
}

export function buildVersionPath(
  namespace: string,
  name: string,
  version: string
): string {
  return `${buildAgentPath(namespace, name)}/versions/${encodeURIComponent(version)}`;
}
