import type { AgentCompatibility } from "./agent-record.js";

type CompatibilityDefaultsInput = {
  namespace: string;
  name: string;
};

const EMPTY_COMPATIBILITY: AgentCompatibility = {
  targets: []
};

const DEMO_COMPATIBILITY: Record<string, AgentCompatibility> = {
  "raul/code-reviewer": {
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
        targetId: "github-copilot",
        builtFor: true,
        tested: false,
        adapterAvailable: true
      },
      {
        targetId: "openclaw",
        builtFor: false,
        tested: false,
        adapterAvailable: true
      },
      {
        targetId: "crewai",
        builtFor: false,
        tested: false,
        adapterAvailable: true
      },
      {
        targetId: "langchain",
        builtFor: false,
        tested: false,
        adapterAvailable: true
      }
    ]
  },
  "acme/support-triager": {
    targets: [
      {
        targetId: "gemini-cli",
        builtFor: true,
        tested: true,
        adapterAvailable: true
      },
      {
        targetId: "opencode",
        builtFor: true,
        tested: false,
        adapterAvailable: true
      },
      {
        targetId: "github-copilot",
        builtFor: false,
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
  }
};

export function createEmptyCompatibility(): AgentCompatibility {
  return {
    targets: []
  };
}

export function cloneCompatibility(compatibility: AgentCompatibility): AgentCompatibility {
  return {
    targets: compatibility.targets.map((target) => ({ ...target }))
  };
}

export function parseCompatibilityJson(
  value: string | null | undefined,
  fallback: AgentCompatibility = createEmptyCompatibility()
): AgentCompatibility {
  if (!value) {
    return cloneCompatibility(fallback);
  }

  try {
    const parsed = JSON.parse(value) as AgentCompatibility;
    if (!parsed || !Array.isArray(parsed.targets)) {
      return cloneCompatibility(fallback);
    }

    const targets = parsed.targets.filter(
      (target) =>
        typeof target?.targetId === "string" &&
        typeof target.builtFor === "boolean" &&
        typeof target.tested === "boolean" &&
        typeof target.adapterAvailable === "boolean"
    );

    return {
      targets: targets.map((target) => ({ ...target }))
    };
  } catch {
    return cloneCompatibility(fallback);
  }
}

export function createDefaultCompatibility(input: CompatibilityDefaultsInput): AgentCompatibility {
  const key = `${input.namespace}/${input.name}`;
  const compatibility = DEMO_COMPATIBILITY[key] ?? EMPTY_COMPATIBILITY;

  return cloneCompatibility(compatibility);
}
