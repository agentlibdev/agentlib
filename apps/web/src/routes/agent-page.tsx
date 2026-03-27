import { Breadcrumbs } from "../components/breadcrumbs.js";
import { buildCreatorPath } from "../lib/router.js";
import type { AgentDetailResponse, SessionResponse } from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";
import { buildVersionPath } from "../lib/router.js";

type AgentPageProps = {
  detail: AgentDetailResponse;
  onNavigate: (path: string) => void;
  breadcrumbs: Breadcrumb[];
  session: SessionResponse["session"];
  onUpdateLifecycle: (
    namespace: string,
    name: string,
    lifecycleStatus: "active" | "deprecated" | "unmaintained"
  ) => Promise<void>;
  onRecordMetric: (
    namespace: string,
    name: string,
    action: "pins" | "stars"
  ) => Promise<void>;
  onRemoveMetric: (
    namespace: string,
    name: string,
    action: "pins" | "stars"
  ) => Promise<void>;
};

export function AgentPage({
  detail,
  onNavigate,
  breadcrumbs,
  session,
  onUpdateLifecycle,
  onRecordMetric,
  onRemoveMetric
}: AgentPageProps) {
  const canManageLifecycle = session?.handle === detail.agent.ownerHandle;

  return (
    <section className="panel stack-lg">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />

      <div className="stack-xs">
        <p className="eyebrow">Agent</p>
        <h1>
          {detail.agent.namespace}/{detail.agent.name}
        </h1>
        <p className="lede">Latest version: {detail.agent.latestVersion}</p>
        <div className="meta-row">
          <button
            className="secondary-action"
            onClick={() => onNavigate(buildCreatorPath(detail.agent.ownerHandle))}
            type="button"
          >
            Owner {detail.agent.ownerHandle}
          </button>
          <span>Status {detail.agent.lifecycleStatus}</span>
          <span>{detail.agent.downloadCount} downloads</span>
          <span>{detail.agent.starCount} stars</span>
          <span>{detail.agent.pinCount} pins</span>
        </div>
      </div>

      <div className="action-row">
        <button
          className="secondary-action"
          disabled={!session}
          onClick={() =>
            void (detail.agent.viewer.hasStarred
              ? onRemoveMetric(detail.agent.namespace, detail.agent.name, "stars")
              : onRecordMetric(detail.agent.namespace, detail.agent.name, "stars"))
          }
          type="button"
        >
          {!session
            ? "Sign in to star"
            : detail.agent.viewer.hasStarred
              ? "Starred"
              : "Star"}
        </button>
        <button
          className="secondary-action"
          disabled={!session}
          onClick={() =>
            void (detail.agent.viewer.hasPinned
              ? onRemoveMetric(detail.agent.namespace, detail.agent.name, "pins")
              : onRecordMetric(detail.agent.namespace, detail.agent.name, "pins"))
          }
          type="button"
        >
          {!session
            ? "Sign in to pin"
            : detail.agent.viewer.hasPinned
              ? "Pinned"
              : "Pin"}
        </button>
      </div>

      {canManageLifecycle ? (
        <div className="action-row">
          <button
            className="secondary-action"
            onClick={() => void onUpdateLifecycle(detail.agent.namespace, detail.agent.name, "active")}
            type="button"
          >
            Mark active
          </button>
          <button
            className="secondary-action"
            onClick={() =>
              void onUpdateLifecycle(detail.agent.namespace, detail.agent.name, "deprecated")
            }
            type="button"
          >
            Mark deprecated
          </button>
          <button
            className="secondary-action"
            onClick={() =>
              void onUpdateLifecycle(detail.agent.namespace, detail.agent.name, "unmaintained")
            }
            type="button"
          >
            Mark unmaintained
          </button>
        </div>
      ) : null}

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
