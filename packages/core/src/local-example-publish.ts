import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseManifestYaml } from "@agentlibdev/agent-schema";

type PublishArtifact = {
  path: string;
  mediaType: string;
  content: string;
};

type LocalExampleManifest = {
  metadata: {
    namespace: string;
    name: string;
    version: string;
  };
} & Record<string, unknown>;

export type LocalExamplePublishPayload = {
  manifest: LocalExampleManifest;
  readme: string;
  artifacts: PublishArtifact[];
};

async function readOptionalFile(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function buildArtifact(path: string, mediaType: string, content: Buffer | string): PublishArtifact {
  return {
    path,
    mediaType,
    content: Buffer.from(content).toString("base64")
  };
}

export async function buildLocalExamplePublishPayload(
  examplePath: string
): Promise<LocalExamplePublishPayload> {
  const root = resolve(examplePath);
  const manifestRaw = await readFile(resolve(root, "agent.yaml"), "utf8");
  const readmeRaw = await readFile(resolve(root, "README.md"), "utf8");
  const agentMdRaw = await readOptionalFile(resolve(root, "agent.md"));
  const licenseRaw = await readOptionalFile(resolve(root, "LICENSE"));

  const artifacts: PublishArtifact[] = [
    buildArtifact("agent.yaml", "application/yaml", manifestRaw),
    buildArtifact("README.md", "text/markdown", readmeRaw)
  ];

  if (agentMdRaw) {
    artifacts.push(buildArtifact("agent.md", "text/markdown", agentMdRaw));
  }

  if (licenseRaw) {
    artifacts.push(buildArtifact("LICENSE", "text/plain", licenseRaw));
  }

  return {
    manifest: parseManifestYaml(manifestRaw) as LocalExampleManifest,
    readme: readmeRaw,
    artifacts
  };
}
