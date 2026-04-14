import { readdir, readFile } from "node:fs/promises";
import { basename, posix, relative, resolve } from "node:path";

import type {
  AgentCompatibility,
  AgentPackageKind,
  PublishArtifactInput,
  PublishRequest
} from "./agent-record.js";

type LocalRepositoryPublishOptions = {
  namespace: string;
  name: string;
  version: string;
  title: string;
  description: string;
  packageKind: AgentPackageKind;
  compatibility?: AgentCompatibility;
  license?: string;
};

const SKIPPED_NAMES = new Set([
  ".git",
  ".wrangler",
  "node_modules",
  "dist",
  "build",
  ".next"
]);

const TEXT_MEDIA_TYPES = new Map<string, string>([
  [".md", "text/markdown"],
  [".txt", "text/plain"],
  [".json", "application/json"],
  [".yaml", "application/yaml"],
  [".yml", "application/yaml"],
  [".js", "text/javascript"],
  [".ts", "text/plain"],
  [".tsx", "text/plain"],
  [".jsx", "text/plain"],
  [".css", "text/css"],
  [".html", "text/html"],
  [".sh", "text/plain"]
]);

function inferMediaType(path: string): string {
  const lower = path.toLowerCase();

  for (const [extension, mediaType] of TEXT_MEDIA_TYPES.entries()) {
    if (lower.endsWith(extension)) {
      return mediaType;
    }
  }

  if (lower.endsWith("license")) {
    return "text/plain";
  }

  return "application/octet-stream";
}

function buildArtifact(path: string, content: Buffer): PublishArtifactInput {
  return {
    path,
    mediaType: inferMediaType(path),
    content: content.toString("base64")
  };
}

async function collectArtifacts(root: string, currentDir = root): Promise<PublishArtifactInput[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const artifacts: PublishArtifactInput[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (SKIPPED_NAMES.has(entry.name) || entry.name.startsWith(".DS_Store")) {
      continue;
    }

    const absolutePath = resolve(currentDir, entry.name);
    if (entry.isDirectory()) {
      artifacts.push(...(await collectArtifacts(root, absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const path = relative(root, absolutePath).split("\\").join(posix.sep);
    const content = await readFile(absolutePath);
    artifacts.push(buildArtifact(path, content));
  }

  return artifacts;
}

function buildSyntheticManifest(options: LocalRepositoryPublishOptions): PublishRequest["manifest"] {
  return {
    apiVersion: "agentlib.dev/v1alpha1",
    kind: "Agent",
    metadata: {
      namespace: options.namespace,
      name: options.name,
      version: options.version,
      title: options.title,
      description: options.description,
      ...(options.license ? { license: options.license } : {})
    },
    spec: {
      summary: options.description,
      inputs: [],
      outputs: [],
      tools: []
    }
  };
}

export async function buildLocalRepositoryPublishPayload(
  repositoryPath: string,
  options: LocalRepositoryPublishOptions
): Promise<PublishRequest> {
  const root = resolve(repositoryPath);
  const artifacts = await collectArtifacts(root);
  artifacts.sort((left, right) => left.path.localeCompare(right.path));
  const readmeArtifact = artifacts.find((artifact) => artifact.path === "README.md");
  const readme = readmeArtifact
    ? Buffer.from(readmeArtifact.content, "base64").toString("utf8")
    : `# ${options.title}\n\n${options.description}\n`;

  return {
    packageKind: options.packageKind,
    manifest: buildSyntheticManifest(options),
    readme,
    ...(options.compatibility ? { compatibility: options.compatibility } : {}),
    artifacts
  };
}

export function inferRepositoryTitle(path: string): string {
  return basename(resolve(path));
}
