import type {
  AgentAuthority,
  AgentNamespaceType,
  AgentProvenance,
  AgentVerificationStatus
} from "./agent-record.js";

type DefaultAuthorityInput = {
  namespace: string;
  name: string;
  namespaceType?: AgentNamespaceType;
  verificationStatus?: AgentVerificationStatus;
  claimedByNamespace?: string | null;
};

type DefaultProvenanceInput = {
  ownerHandle: string;
  ownerDisplayName?: string | null;
  sourceType?: AgentProvenance["sourceType"];
  sourceUrl?: string | null;
  sourceRepositoryUrl?: string | null;
  originalAuthorHandle?: string | null;
  originalAuthorName?: string | null;
  originalAuthorUrl?: string | null;
  submittedByHandle?: string | null;
  submittedByName?: string | null;
};

export function createDefaultAuthority(input: DefaultAuthorityInput): AgentAuthority {
  return {
    namespaceType: input.namespaceType ?? "official",
    verificationStatus: input.verificationStatus ?? "official",
    canonicalNamespace: input.namespace,
    canonicalName: input.name,
    claimedByNamespace: input.claimedByNamespace ?? null
  };
}

export function createDefaultProvenance(input: DefaultProvenanceInput): AgentProvenance {
  return {
    sourceType: input.sourceType ?? "manual",
    sourceUrl: input.sourceUrl ?? null,
    sourceRepositoryUrl: input.sourceRepositoryUrl ?? null,
    originalAuthorHandle: input.originalAuthorHandle ?? input.ownerHandle,
    originalAuthorName: input.originalAuthorName ?? input.ownerDisplayName ?? input.ownerHandle,
    originalAuthorUrl: input.originalAuthorUrl ?? null,
    submittedByHandle: input.submittedByHandle ?? input.ownerHandle,
    submittedByName: input.submittedByName ?? input.ownerDisplayName ?? input.ownerHandle
  };
}
