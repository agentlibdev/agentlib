export type ParsedGithubRepositoryUrl = {
  repositoryUrl: string;
  owner: string;
  repo: string;
};

export function parseGithubRepositoryUrl(value: string): ParsedGithubRepositoryUrl | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!owner || !repo) {
    return null;
  }

  return {
    repositoryUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo
  };
}
