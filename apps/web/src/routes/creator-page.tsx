import { Breadcrumbs } from "../components/breadcrumbs.js";
import { buildAgentPath } from "../lib/router.js";
import type { AgentListItem } from "../lib/types.js";
import type { Breadcrumb, CreatorRank } from "../lib/view-models.js";

type CreatorPageProps = {
  handle: string;
  agents: AgentListItem[];
  creator: CreatorRank | null;
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
};

export function CreatorPage({
  handle,
  agents,
  creator,
  breadcrumbs,
  onNavigate
}: CreatorPageProps) {
  return (
    <section className="panel stack-lg">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />

      <div className="stack-xs">
        <p className="eyebrow">Creator</p>
        <h1>{handle}</h1>
        <p className="lede">
          {creator
            ? `${creator.agentCount} agents · ${creator.totalDownloads} downloads · ${creator.totalStars} stars`
            : "No published agents yet."}
        </p>
      </div>

      <div className="split-layout">
        <section className="stack-sm">
          <h2>Creator summary</h2>
          <div className="detail-list">
            <p>
              <strong>{creator?.agentCount ?? 0}</strong>
              <span>Published agents</span>
            </p>
            <p>
              <strong>{creator?.totalDownloads ?? 0}</strong>
              <span>Total downloads</span>
            </p>
            <p>
              <strong>{creator?.totalStars ?? 0}</strong>
              <span>Total stars</span>
            </p>
            <p>
              <strong>{creator?.totalPins ?? 0}</strong>
              <span>Total pins</span>
            </p>
          </div>
        </section>
      </div>

      <section className="stack-sm">
        <div className="section-head">
          <h2>Published catalog</h2>
          <span>{agents.length} items</span>
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
              <p>
                {agent.downloadCount} downloads · {agent.starCount} stars · {agent.pinCount} pins
              </p>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
