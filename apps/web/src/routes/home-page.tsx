import type { AgentListItem } from "../lib/types.js";
import { buildAgentPath } from "../lib/router.js";

type HomePageProps = {
  agents: AgentListItem[];
  onNavigate: (path: string) => void;
};

export function HomePage({ agents, onNavigate }: HomePageProps) {
  return (
    <section className="panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Registry</p>
        <h1>Portable agents, versioned and explorable.</h1>
        <p className="lede">
          AgentLib is now readable end-to-end: browse registry entries, inspect versions, and
          jump directly to published artifacts.
        </p>
      </div>

      <div className="agent-grid">
        {agents.map((agent) => (
          <button
            key={`${agent.namespace}/${agent.name}`}
            className="agent-card"
            onClick={() => onNavigate(buildAgentPath(agent.namespace, agent.name))}
            type="button"
          >
            <div className="agent-card-head">
              <span className="agent-slug">
                {agent.namespace}/{agent.name}
              </span>
              <span className="agent-pill">v{agent.latestVersion}</span>
            </div>
            <h2>{agent.title}</h2>
            <p>{agent.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
