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

  async getPackageFiles(repository: GithubRepository, ref?: string): Promise<GithubPackageFilesResult> {
    const resolvedRef = ref ?? repository.defaultBranch;
    const [readmeResponse, manifestResponse] = await Promise.all([
      this.fetchFn(
        `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${resolvedRef}/README.md`,
        {
          headers: this.createHeaders()
        }
      ),
      this.fetchFn(
        `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${resolvedRef}/agent.yaml`,
        {
          headers: this.createHeaders()
        }
      )
    ]);

    if (readmeResponse.status === 404 || manifestResponse.status === 404) {
      throw new Error("manifest_not_found");
    }

    if (!readmeResponse.ok || !manifestResponse.ok) {
      throw new Error("github_upstream_error");
    }

    const readme = await readmeResponse.text();
    const manifestSource = await manifestResponse.text();

    return {
      readme,
      artifacts: [
        {
          path: "README.md",
          mediaType: "text/markdown",
          content: btoa(readme)
        },
        {
          path: "agent.yaml",
          mediaType: "application/yaml",
          content: btoa(manifestSource)
        }
      ]
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
