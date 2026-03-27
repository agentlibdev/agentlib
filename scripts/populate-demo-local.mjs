import { waitForHealth } from "./_local-api.mjs";

const baseUrl = "http://127.0.0.1:8787";

const users = [
  {
    provider: "github",
    subject: "demo-raul",
    handle: "raul",
    displayName: "Raul Gimenez",
    email: "raul@example.com"
  },
  {
    provider: "github",
    subject: "demo-lina",
    handle: "lina",
    displayName: "Lina Park",
    email: "lina@example.com"
  },
  {
    provider: "google",
    subject: "demo-marta",
    handle: "marta",
    displayName: "Marta Soler",
    email: "marta@example.com"
  },
  {
    provider: "github",
    subject: "demo-acme",
    handle: "acme",
    displayName: "Acme Labs",
    email: "hello@acme.test"
  }
];

const agentSpecs = [
  ["raul", "code-reviewer", "0.3.0", "Code Reviewer", "Reviews pull requests for correctness and maintainability."],
  ["raul", "docs-writer", "0.1.0", "Docs Writer", "Produces crisp README and migration notes from code changes."],
  ["lina", "incident-scribe", "0.1.0", "Incident Scribe", "Turns noisy incident channels into timelines and action items."],
  ["lina", "design-critic", "0.1.0", "Design Critic", "Reviews product flows and highlights friction before launch."],
  ["marta", "qa-scout", "0.1.0", "QA Scout", "Builds focused regression checklists from commits and issues."],
  ["marta", "localizer", "0.1.0", "Localizer", "Adapts launch copy and release notes across markets."],
  ["acme", "support-triager", "0.2.0", "Support Triager", "Classifies incoming support requests and proposes routing."],
  ["acme", "sales-researcher", "0.1.0", "Sales Researcher", "Prepares account briefs and recent-company snapshots."]
];

function headersForUser(user) {
  return {
    "content-type": "application/json",
    "x-agentlib-auth-provider": user.provider,
    "x-agentlib-auth-subject": user.subject,
    "x-agentlib-auth-handle": user.handle,
    "x-agentlib-auth-name": user.displayName,
    "x-agentlib-auth-email": user.email
  };
}

function artifact(path, mediaType, content) {
  return {
    path,
    mediaType,
    content: Buffer.from(content).toString("base64")
  };
}

function buildPublishRequest(namespace, name, version, title, description, artifactCount) {
  const artifacts = [
    artifact(
      "agent.yaml",
      "application/yaml",
      `apiVersion: agentlib.dev/v1alpha1\nkind: Agent\nmetadata:\n  namespace: ${namespace}\n  name: ${name}\n  version: ${version}\n  title: ${title}\n  description: ${description}\n`
    ),
    artifact("README.md", "text/markdown", `# ${title}\n\n${description}\n`),
    artifact("agent.md", "text/markdown", `You are ${title}. Stay precise and useful.\n`)
  ];

  for (let index = 0; index < artifactCount; index += 1) {
    artifacts.push(
      artifact(
        `assets/example-${index + 1}.txt`,
        "text/plain",
        `${title} supporting asset ${index + 1}\n`
      )
    );
  }

  return {
    manifest: {
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      metadata: {
        namespace,
        name,
        version,
        title,
        description,
        license: "MIT"
      },
      spec: {
        summary: description,
        inputs: [],
        outputs: [],
        tools: []
      }
    },
    readme: `# ${title}\n\n${description}\n`,
    artifacts
  };
}

async function postJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}: ${text}`);
    error.statusCode = response.status;
    error.body = text;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

await waitForHealth(baseUrl);

const published = [];

for (let index = 0; index < agentSpecs.length; index += 1) {
  const [namespace, name, version, title, description] = agentSpecs[index];
  const owner = users.find((user) => user.handle === namespace);
  const payload = buildPublishRequest(namespace, name, version, title, description, 2 + (index % 4));

  try {
    await postJson(`${baseUrl}/api/v1/publish`, {
      method: "POST",
      headers: headersForUser(owner),
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("version_exists")) {
      throw error;
    }
  }

  published.push({ namespace, name, owner: namespace });
}

for (let index = 0; index < published.length; index += 1) {
  const agent = published[index];
  const downloads = 12 + index * 17;
  for (let count = 0; count < downloads; count += 1) {
    await postJson(`${baseUrl}/api/v1/agents/${agent.namespace}/${agent.name}/downloads`, {
      method: "POST"
    });
  }

  for (const user of users) {
    if (user.handle !== agent.owner && (index + user.handle.length) % 2 === 0) {
      await postJson(`${baseUrl}/api/v1/agents/${agent.namespace}/${agent.name}/pins`, {
        method: "POST",
        headers: headersForUser(user)
      });
    }

    if (user.handle !== agent.owner && (index + user.handle.length) % 3 !== 0) {
      await postJson(`${baseUrl}/api/v1/agents/${agent.namespace}/${agent.name}/stars`, {
        method: "POST",
        headers: headersForUser(user)
      });
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      users: users.map((user) => user.handle),
      agents: published
    },
    null,
    2
  )
);
