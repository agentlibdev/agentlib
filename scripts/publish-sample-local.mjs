const version = process.argv[2] ?? "0.3.0";

async function waitForHealth() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:8787/health");
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Local API did not become ready in time");
}

await waitForHealth();

const response = await fetch("http://127.0.0.1:8787/api/v1/publish", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    manifest: {
      metadata: {
        namespace: "raul",
        name: "code-reviewer",
        version,
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        license: "MIT"
      }
    },
    readme: "# Code Reviewer\n",
    artifacts: [
      {
        path: "agent.yaml",
        mediaType: "application/yaml",
        content: Buffer.from("apiVersion: agentlib.dev/v1alpha1\nkind: Agent\n").toString("base64")
      },
      {
        path: "README.md",
        mediaType: "text/markdown",
        content: Buffer.from("# Code Reviewer\n").toString("base64")
      }
    ]
  })
});

const body = await response.text();
console.log(body);
process.exitCode = response.ok ? 0 : 1;
