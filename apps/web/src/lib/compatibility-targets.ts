export type CompatibilityTargetOption = {
  id: string;
  label: string;
};

export const COMPATIBILITY_TARGETS: CompatibilityTargetOption[] = [
  { id: "codex", label: "Codex" },
  { id: "claude-code", label: "Claude Code" },
  { id: "github-copilot", label: "GitHub Copilot" },
  { id: "gemini-cli", label: "Gemini CLI" },
  { id: "opencode", label: "OpenCode" },
  { id: "cursor", label: "Cursor" },
  { id: "kiro", label: "Kiro" },
  { id: "antigravity", label: "Antigravity" },
  { id: "windsurf", label: "Windsurf" },
  { id: "vscode", label: "VS Code" },
  { id: "openclaw", label: "OpenClaw" },
  { id: "crewai", label: "CrewAI" },
  { id: "langchain", label: "LangChain" }
];

export function getCompatibilityTargetLabel(targetId: string): string {
  return COMPATIBILITY_TARGETS.find((target) => target.id === targetId)?.label ?? targetId;
}
