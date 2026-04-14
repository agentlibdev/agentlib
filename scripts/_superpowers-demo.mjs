export const superpowersCompatibility = {
  targets: [
    {
      targetId: "codex",
      builtFor: true,
      tested: true,
      adapterAvailable: true
    },
    {
      targetId: "claude-code",
      builtFor: true,
      tested: true,
      adapterAvailable: true
    },
    {
      targetId: "cursor",
      builtFor: true,
      tested: false,
      adapterAvailable: true
    },
    {
      targetId: "gemini-cli",
      builtFor: true,
      tested: false,
      adapterAvailable: true
    },
    {
      targetId: "github-copilot",
      builtFor: true,
      tested: false,
      adapterAvailable: true
    },
    {
      targetId: "opencode",
      builtFor: true,
      tested: false,
      adapterAvailable: true
    },
    {
      targetId: "antigravity",
      builtFor: true,
      tested: false,
      adapterAvailable: true
    },
    {
      targetId: "openclaw",
      builtFor: false,
      tested: false,
      adapterAvailable: true
    }
  ]
};

export function buildSuperpowersDemoHeaders() {
  return {
    "content-type": "application/json",
    "x-agentlib-auth-provider": "github",
    "x-agentlib-auth-subject": "demo-obra",
    "x-agentlib-auth-handle": "obra",
    "x-agentlib-auth-name": "Obra"
  };
}

export function resolveSuperpowersVersion(explicitVersion) {
  return explicitVersion || "2026.04.13-demo";
}
