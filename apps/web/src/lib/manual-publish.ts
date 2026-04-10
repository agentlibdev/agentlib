import type { AgentCompatibility, PublishRequest } from "./types.js";

export type ManualPublishInput = {
  namespace: string;
  name: string;
  version: string;
  title: string;
  description: string;
  license: string;
  summary: string;
  readme: string;
  compatibility: AgentCompatibility;
};

async function encodeFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return Buffer.from(bytes).toString("base64");
}

export async function buildManualPublishRequest(
  input: ManualPublishInput,
  files: File[]
): Promise<PublishRequest> {
  return {
    manifest: {
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      metadata: {
        namespace: input.namespace.trim(),
        name: input.name.trim(),
        version: input.version.trim(),
        title: input.title.trim(),
        description: input.description.trim(),
        ...(input.license.trim() ? { license: input.license.trim() } : {})
      },
      spec: {
        summary: input.summary.trim(),
        inputs: [],
        outputs: [],
        tools: []
      }
    },
    compatibility: input.compatibility,
    readme: input.readme,
    artifacts: await Promise.all(
      files.map(async (file) => ({
        path: file.name,
        mediaType: file.type || "application/octet-stream",
        content: await encodeFile(file)
      }))
    )
  };
}
