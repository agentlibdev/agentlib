import { Breadcrumbs } from "../components/breadcrumbs.js";
import { buildArtifactDownloadUrl } from "../lib/api.js";
import type { AgentVersionDetailResponse, ArtifactItem, SessionResponse } from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";

type VersionPageProps = {
  detail: AgentVersionDetailResponse;
  artifacts: ArtifactItem[];
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
  session: SessionResponse["session"];
};

export function VersionPage({ detail, artifacts, breadcrumbs, onNavigate }: VersionPageProps) {
  return (
    <section className="panel stack-lg">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />

      <div className="stack-xs">
        <p className="eyebrow">Version</p>
        <h1>
          {detail.version.namespace}/{detail.version.name}@{detail.version.version}
        </h1>
        <p className="lede">{detail.version.description}</p>
        <div className="meta-row">
          <span>Published {new Date(detail.version.publishedAt).toLocaleString()}</span>
          <span>Owner {detail.version.ownerHandle}</span>
          <span>Status {detail.version.lifecycleStatus}</span>
          <span>{detail.version.license ?? "No license set"}</span>
        </div>
      </div>

      <div className="artifact-panel stack-sm">
        <h2>Artifacts</h2>
        {artifacts.length === 0 ? (
          <div className="empty-state inset-empty stack-sm">
            <p className="eyebrow">Empty</p>
            <h2>No artifacts published for this version.</h2>
          </div>
        ) : (
          <div className="artifact-list">
            {artifacts.map((artifact) => (
              <a
                key={artifact.path}
                className="artifact-row"
                href={buildArtifactDownloadUrl(
                  detail.version.namespace,
                  detail.version.name,
                  detail.version.version,
                  artifact.path
                )}
              >
                <span>{artifact.path}</span>
                <span>
                  {artifact.mediaType} · {artifact.sizeBytes} bytes
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="manifest-panel stack-sm">
        <h2>Manifest snapshot</h2>
        <pre>{detail.version.manifestJson}</pre>
      </div>
    </section>
  );
}
