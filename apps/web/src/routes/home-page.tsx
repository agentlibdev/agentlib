import { useDeferredValue, useState } from "react";

import {
  buildAgentPath,
  buildCreatorPath,
  buildImportNewPath,
  buildManualPublishPath
} from "../lib/router.js";
import type { AgentListItem, RegistryHighlightsResponse, SessionResponse } from "../lib/types.js";
import { filterAgents, rankCreators } from "../lib/view-models.js";

type HomePageProps = {
  agents: AgentListItem[];
  highlights: RegistryHighlightsResponse;
  onNavigate: (path: string) => void;
  session: SessionResponse["session"];
};

export function HomePage({ agents, highlights, onNavigate, session }: HomePageProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredAgents = filterAgents(agents, deferredQuery);
  const topCreators = rankCreators(agents).slice(0, 5);
  const summary =
    highlights.highlights.stats.totalDownloads > 0
      ? `${highlights.highlights.stats.totalDownloads} downloads already signal real interest in the catalog.`
      : "Seed the registry with demo activity to see momentum and rankings come alive.";

  return (
    <section className="panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Registry</p>
        <h1>Portable agents, versioned and explorable.</h1>
        <p className="lede">
          AgentLib is now readable end-to-end: browse registry entries, inspect versions, and
          jump directly to published artifacts.
        </p>
        <p>{summary}</p>
      </div>

      <div className="split-layout">
        <section className="stack-sm">
          <h2>Registry momentum</h2>
          <div className="detail-list">
            <p>
              <strong>{highlights.highlights.stats.totalAgents}</strong>
              <span>published agents</span>
            </p>
            <p>
              <strong>{highlights.highlights.stats.totalDownloads}</strong>
              <span>downloads registered</span>
            </p>
            <p>
              <strong>{highlights.highlights.stats.totalPins}</strong>
              <span>pins saved by users</span>
            </p>
            <p>
              <strong>{highlights.highlights.stats.totalStars}</strong>
              <span>stars across the registry</span>
            </p>
          </div>
        </section>

        <section className="stack-sm">
          <div className="section-head">
            <h2>Top agents</h2>
            <span>Ranked by traction</span>
          </div>
          <div className="version-list">
            {highlights.highlights.topAgents.map((agent) => (
              <button
                key={`top-${agent.namespace}/${agent.name}`}
                className="version-row stack-xs"
                onClick={() => onNavigate(buildAgentPath(agent.namespace, agent.name))}
                type="button"
              >
                <div className="agent-card-head">
                  <span className="agent-slug">
                    {agent.namespace}/{agent.name}
                  </span>
                  <span className="agent-pill">{agent.downloadCount} dl</span>
                </div>
                <strong>{agent.title}</strong>
                <p>
                  {agent.starCount} stars · {agent.pinCount} pins
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="stack-sm">
          <div className="section-head">
            <h2>Top creators</h2>
            <span>By aggregate traction</span>
          </div>
          <div className="version-list">
            {topCreators.map((creator) => (
              <button
                className="version-row stack-xs"
                key={`creator-${creator.handle}`}
                onClick={() => onNavigate(buildCreatorPath(creator.handle))}
                type="button"
              >
                <strong>{creator.handle}</strong>
                <p>
                  {creator.agentCount} agents · {creator.totalDownloads} downloads ·{" "}
                  {creator.totalStars} stars
                </p>
              </button>
            ))}
          </div>
        </section>
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
          <p className="eyebrow">Manual Registry</p>
          <h2>Create a package entry directly from the browser.</h2>
          <p>Fill the manifest fields, paste your README, and upload the artifacts to publish.</p>
        </div>
        <button
          className="primary-action"
          onClick={() => onNavigate(buildManualPublishPath())}
          type="button"
        >
          {session ? "Create manually" : "Sign in to create"}
        </button>
      </div>

      <div className="callout-banner callout-banner-secondary">
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
          {session ? "Start import" : "Sign in to import"}
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
            <p>
              {agent.downloadCount} downloads · {agent.starCount} stars · {agent.pinCount} pins
            </p>
            <span className="agent-card-link">Open agent</span>
          </button>
        ))}
      </div>
    </section>
  );
}
