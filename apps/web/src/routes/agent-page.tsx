import { Breadcrumbs } from "../components/breadcrumbs.js";
import type { AgentDetailResponse } from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";
import { buildVersionPath } from "../lib/router.js";

type AgentPageProps = {
  detail: AgentDetailResponse;
  onNavigate: (path: string) => void;
  breadcrumbs: Breadcrumb[];
};

export function AgentPage({ detail, onNavigate, breadcrumbs }: AgentPageProps) {
  return (
    <section className="panel stack-lg">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />

      <div className="stack-xs">
        <p className="eyebrow">Agent</p>
        <h1>
          {detail.agent.namespace}/{detail.agent.name}
        </h1>
        <p className="lede">Latest version: {detail.agent.latestVersion}</p>
      </div>

      <div className="version-list">
        {detail.versions.map((version) => (
          <button
            key={version.version}
            className="version-row"
            onClick={() =>
              onNavigate(
                buildVersionPath(
                  detail.agent.namespace,
                  detail.agent.name,
                  version.version
                )
              )
            }
            type="button"
          >
            <div>
              <strong>{version.version}</strong>
              <p>{version.title}</p>
            </div>
            <div className="version-meta">
              <span>{new Date(version.publishedAt).toLocaleString()}</span>
              <span>{version.description}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
