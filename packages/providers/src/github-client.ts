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

export type GithubPackageFilesResult = {
  readme: string;
  artifacts: Array<{
    path: string;
    mediaType: string;
    content: string;
  }>;
};

export interface GithubClient {
  getRepository(repositoryUrl: string): Promise<GithubRepository>;
  getManifest(repository: GithubRepository, ref?: string): Promise<GithubManifestResult>;
  getPackageFiles(repository: GithubRepository, ref?: string): Promise<GithubPackageFilesResult>;
}

export class FetchGithubClient implements GithubClient {
  private readonly fetchFn: typeof fetch;

  constructor(
    fetchFn?: typeof fetch,
    private readonly token?: string
  ) {
    this.fetchFn = fetchFn ?? ((input, init) => globalThis.fetch(input, init));
  }

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

    this.assertGithubResponse(response, "repository_not_found");

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

    this.assertGithubResponse(response, "manifest_not_found");

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

  async getPackageFiles(repository: GithubRepository, ref?: string): Promise<GithubPackageFilesResult> {
    const resolvedRef = ref ?? repository.defaultBranch;
    const files = await Promise.all([
      this.fetchFile(repository, resolvedRef, "README.md", false, "text/markdown"),
      this.fetchFile(repository, resolvedRef, "agent.md", true, "text/markdown"),
      this.fetchFile(repository, resolvedRef, "LICENSE", true, "text/plain"),
      this.fetchFile(repository, resolvedRef, "agent.yaml", false, "application/yaml")
    ]);

    const readme = files[0]?.content ?? "";

    return {
      readme,
      artifacts: files
        .filter((entry): entry is { path: string; mediaType: string; content: string } => entry !== null)
        .map((entry) => ({
          path: entry.path,
          mediaType: entry.mediaType,
          content: btoa(entry.content)
        }))
    };
  }

  private async fetchFile(
    repository: GithubRepository,
    resolvedRef: string,
    path: string,
    optional: boolean,
    mediaType: string
  ): Promise<{ path: string; mediaType: string; content: string } | null> {
    const response = await this.fetchFn(
      `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${resolvedRef}/${path}`,
      {
        headers: this.createHeaders()
      }
    );

    if (response.status === 404) {
      if (optional) {
        return null;
      }

      throw new Error("manifest_not_found");
    }

    this.assertGithubResponse(response);

    return {
      path,
      mediaType,
      content: await response.text()
    };
  }

  private assertGithubResponse(
    response: Response,
    notFoundCode?: "repository_not_found" | "manifest_not_found"
  ): void {
    if (response.status === 404 && notFoundCode) {
      throw new Error(notFoundCode);
    }

    if (response.status === 429) {
      throw new Error("github_rate_limited");
    }

    if (!response.ok) {
      throw new Error("github_upstream_error");
    }
  }

  private createHeaders(): HeadersInit {
    return {
      "user-agent": "agentlib-dev",
      accept: "application/vnd.github+json",
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
    };
  }
}
