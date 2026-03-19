import assert from "node:assert/strict";
import test from "node:test";

import { FetchGithubClient } from "../../../packages/providers/src/github-client.js";

test("FetchGithubClient uses a fetch implementation with the correct this binding", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async function (
    this: typeof globalThis | undefined,
    input: RequestInfo | URL
  ) {
    assert.equal(this, globalThis);
    assert.equal(String(input), "https://api.github.com/repos/agentlibdev/agentlib");

    return new Response(
      JSON.stringify({
        id: 123456,
        html_url: "https://github.com/agentlibdev/agentlib",
        default_branch: "main",
        owner: { login: "agentlibdev" },
        name: "agentlib"
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }) as typeof fetch;

  try {
    const client = new FetchGithubClient();

    const repository = await client.getRepository("https://github.com/agentlibdev/agentlib");

    assert.deepEqual(repository, {
      externalId: "123456",
      url: "https://github.com/agentlibdev/agentlib",
      owner: "agentlibdev",
      name: "agentlib",
      defaultBranch: "main"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
