import type {
  AccountProfileUpdateInput,
  AgentDetail,
  AgentLifecycleStatus,
  AgentLifecycleUpdateResult,
  AgentMetricResult,
  AccountSummary,
  AuthenticatedUser,
  AgentListResult,
  AgentVersionDetail,
  AgentVersionRecord,
  ArtifactContent,
  ArtifactRecord,
  GithubImportRequest,
  GithubImportResult,
  RegistryHighlights,
  PublishRequest,
  PublishResult
} from "./agent-record.js";

export interface AgentRepository {
  listAgents(): Promise<AgentListResult>;
  getAgentDetail(
    namespace: string,
    name: string,
    actor?: AuthenticatedUser | null
  ): Promise<AgentDetail | null>;
  listAgentVersions(namespace: string, name: string): Promise<AgentVersionRecord[] | null>;
  getAgentVersionDetail(
    namespace: string,
    name: string,
    version: string
  ): Promise<AgentVersionDetail | null>;
  listArtifacts(
    namespace: string,
    name: string,
    version: string
  ): Promise<ArtifactRecord[] | null>;
  getArtifactContent(
    namespace: string,
    name: string,
    version: string,
    path: string
  ): Promise<ArtifactContent | null>;
  publishAgentVersion(payload: PublishRequest, actor: AuthenticatedUser): Promise<PublishResult>;
  importGithubRepository?(
    payload: GithubImportRequest,
    actor: AuthenticatedUser
  ): Promise<GithubImportResult>;
  getImportDraft?(id: string): Promise<GithubImportResult | null>;
  publishImportDraft?(id: string, actor: AuthenticatedUser): Promise<PublishResult>;
  updateAgentLifecycle?(
    namespace: string,
    name: string,
    lifecycleStatus: AgentLifecycleStatus,
    actor: AuthenticatedUser
  ): Promise<AgentLifecycleUpdateResult>;
  getAccountSummary?(actor: AuthenticatedUser): Promise<AccountSummary>;
  updateAccountProfile?(
    profile: AccountProfileUpdateInput,
    actor: AuthenticatedUser
  ): Promise<AccountSummary>;
  getRegistryHighlights?(): Promise<RegistryHighlights>;
  recordAgentDownload?(namespace: string, name: string): Promise<AgentMetricResult>;
  addAgentPin?(namespace: string, name: string, actor: AuthenticatedUser): Promise<AgentMetricResult>;
  addAgentStar?(namespace: string, name: string, actor: AuthenticatedUser): Promise<AgentMetricResult>;
  removeAgentPin?(namespace: string, name: string, actor: AuthenticatedUser): Promise<AgentMetricResult>;
  removeAgentStar?(namespace: string, name: string, actor: AuthenticatedUser): Promise<AgentMetricResult>;
}
