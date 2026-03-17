export function createSamplePublishRequest(version = "0.3.0") {
  return {
    manifest: {
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      metadata: {
        namespace: "raul",
        name: "code-reviewer",
        version,
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        license: "MIT"
      },
      spec: {
        summary: "Reviews pull requests with a focus on correctness and maintainability.",
        inputs: [],
        outputs: [],
        tools: []
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
  };
}
