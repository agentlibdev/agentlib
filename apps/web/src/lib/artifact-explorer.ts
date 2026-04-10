import type { ArtifactItem } from "./types.js";

export type ArtifactExplorerEntry =
  | {
      kind: "parent";
      name: "../";
      path: string;
    }
  | {
      kind: "directory";
      name: string;
      path: string;
    }
  | {
      kind: "file";
      name: string;
      path: string;
      mediaType: string;
      sizeBytes: number;
    };

export type ArtifactExplorerState = {
  breadcrumbs: string[];
  entries: ArtifactExplorerEntry[];
};

function compareEntries(left: ArtifactExplorerEntry, right: ArtifactExplorerEntry): number {
  const rank = (entry: ArtifactExplorerEntry): number => {
    if (entry.kind === "parent") {
      return 0;
    }
    if (entry.kind === "directory") {
      return 1;
    }
    return 2;
  };

  return rank(left) - rank(right) || left.name.localeCompare(right.name);
}

export function buildArtifactExplorerState(
  artifacts: ArtifactItem[],
  breadcrumbs: string[]
): ArtifactExplorerState {
  const prefix = breadcrumbs.length > 0 ? `${breadcrumbs.join("/")}/` : "";
  const entries: ArtifactExplorerEntry[] = [];
  const directories = new Set<string>();

  if (breadcrumbs.length > 0) {
    entries.push({
      kind: "parent",
      name: "../",
      path: breadcrumbs.slice(0, -1).join("/")
    });
  }

  for (const artifact of artifacts) {
    if (!artifact.path.startsWith(prefix)) {
      continue;
    }

    const remainder = artifact.path.slice(prefix.length);
    if (remainder.length === 0) {
      continue;
    }

    const [segment, ...rest] = remainder.split("/");
    if (rest.length === 0) {
      entries.push({
        kind: "file",
        name: segment,
        path: artifact.path,
        mediaType: artifact.mediaType,
        sizeBytes: artifact.sizeBytes
      });
      continue;
    }

    if (!directories.has(segment)) {
      directories.add(segment);
      entries.push({
        kind: "directory",
        name: segment,
        path: [...breadcrumbs, segment].join("/")
      });
    }
  }

  return {
    breadcrumbs,
    entries: entries.sort(compareEntries)
  };
}
