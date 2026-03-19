import { parseManifestYaml, validateManifest } from "@agentlibdev/agent-schema";
import { parseGithubRepositoryUrl } from "./github-import.js";

export type GithubRepository = {
  externalId: string;
  url: string;
  owner: string;
  name: string;
  defaultBranch: string;
};

export type GithubManifestResult = {
  resolvedRef: string;
  manifest: unknown;
};

export interface GithubClient {
  getRepository(repositoryUrl: string): Promise<GithubRepository>;
  getManifest(repository: GithubRepository, ref?: string): Promise<GithubManifestResult>;
}

export class FetchGithubClient implements GithubClient {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly token?: string
  ) {}

  async getRepository(repositoryUrl: string): Promise<GithubRepository> {
    const parsed = parseGithubRepositoryUrl(repositoryUrl);
    if (!parsed) {
      throw new Error("unsupported_repository_url");
    }

    const response = await this.fetchFn(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      {
        headers: this.createHeaders()
      }
    );

    if (response.status === 404) {
      throw new Error("repository_not_found");
    }

    if (!response.ok) {
      throw new Error("github_upstream_error");
    }

    const body = (await response.json()) as {
      id: number;
      html_url: string;
      default_branch: string;
      owner: { login: string };
      name: string;
    };

    return {
      externalId: String(body.id),
      url: body.html_url,
      owner: body.owner.login,
      name: body.name,
      defaultBranch: body.default_branch
    };
  }

  async getManifest(repository: GithubRepository, ref?: string): Promise<GithubManifestResult> {
    const resolvedRef = ref ?? repository.defaultBranch;
    const response = await this.fetchFn(
      `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${resolvedRef}/agent.yaml`,
      {
        headers: this.createHeaders()
      }
    );

    if (response.status === 404) {
      throw new Error("manifest_not_found");
    }

    if (!response.ok) {
      throw new Error("github_upstream_error");
    }

    const source = await response.text();
    const manifest = parseManifestYaml(source);

    if (!validateManifest(manifest)) {
      throw new Error("invalid_manifest");
    }

    return {
      resolvedRef,
      manifest
    };
  }

  private createHeaders(): HeadersInit {
    return {
      "user-agent": "agentlib-dev",
      accept: "application/vnd.github+json",
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
    };
  }
}
