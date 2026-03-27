export type RouteMatch =
  | { name: "home" }
  | { name: "account" }
  | { name: "creator"; handle: string }
  | { name: "import-new" }
  | { name: "manual-publish" }
  | { name: "import-detail"; importId: string }
  | { name: "agent"; namespace: string; nameParam: string }
  | { name: "version"; namespace: string; nameParam: string; version: string }
  | { name: "not-found" };

export function matchRoute(pathname: string): RouteMatch {
  if (pathname === "/") {
    return { name: "home" };
  }

  if (pathname === "/account") {
    return { name: "account" };
  }

  const creatorMatch = pathname.match(/^\/creators\/([^/]+)$/);
  if (creatorMatch) {
    const [, handle] = creatorMatch;
    return { name: "creator", handle };
  }

  if (pathname === "/imports/new") {
    return { name: "import-new" };
  }

  if (pathname === "/publish/manual") {
    return { name: "manual-publish" };
  }

  const importDetailMatch = pathname.match(/^\/imports\/([^/]+)$/);
  if (importDetailMatch) {
    const [, importId] = importDetailMatch;
    return { name: "import-detail", importId };
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

export function buildImportNewPath(): string {
  return "/imports/new";
}

export function buildAccountPath(): string {
  return "/account";
}

export function buildCreatorPath(handle: string): string {
  return `/creators/${encodeURIComponent(handle)}`;
}

export function buildManualPublishPath(): string {
  return "/publish/manual";
}

export function buildImportDetailPath(importId: string): string {
  return `/imports/${encodeURIComponent(importId)}`;
}
