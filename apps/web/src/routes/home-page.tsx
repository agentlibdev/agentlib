import { useDeferredValue, useState } from "react";

import { buildAgentPath, buildImportNewPath } from "../lib/router.js";
import type { AgentListItem } from "../lib/types.js";
import { filterAgents } from "../lib/view-models.js";

type HomePageProps = {
  agents: AgentListItem[];
  onNavigate: (path: string) => void;
};

export function HomePage({ agents, onNavigate }: HomePageProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredAgents = filterAgents(agents, deferredQuery);

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

      <div className="toolbar">
        <label className="search-field">
          <span>Filter agents</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by slug, title, or description"
            type="search"
            value={query}
          />
        </label>
        <p className="toolbar-meta">
          {filteredAgents.length} of {agents.length} visible
        </p>
      </div>

      <div className="callout-banner">
        <div className="stack-xs">
          <p className="eyebrow">GitHub Import</p>
          <h2>Bring an external repository in as a draft.</h2>
          <p>Validate `agent.yaml`, inspect the snapshot, and publish manually from the web.</p>
        </div>
        <button
          className="primary-action"
          onClick={() => onNavigate(buildImportNewPath())}
          type="button"
        >
          Start import
        </button>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="empty-state inset-empty stack-sm">
          <p className="eyebrow">No Matches</p>
          <h2>Nothing matches that filter yet.</h2>
          <p>Try a namespace, agent name, or a keyword from the description.</p>
        </div>
      ) : null}

      <div className="agent-grid">
        {filteredAgents.map((agent) => (
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
            <span className="agent-card-link">Open agent</span>
          </button>
        ))}
      </div>
    </section>
  );
}
