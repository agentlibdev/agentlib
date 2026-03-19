import { validateManifest as validateAgentManifest } from "@agentlibdev/agent-schema";

export function validateManifest(manifest: unknown): boolean {
  return validateAgentManifest(manifest);
}
