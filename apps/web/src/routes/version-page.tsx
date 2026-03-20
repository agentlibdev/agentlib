import { buildArtifactDownloadUrl } from "../lib/api.js";
import type { AgentVersionDetailResponse, ArtifactItem } from "../lib/types.js";

type VersionPageProps = {
  detail: AgentVersionDetailResponse;
  artifacts: ArtifactItem[];
};

export function VersionPage({ detail, artifacts }: VersionPageProps) {
  return (
    <section className="panel stack-lg">
      <div className="stack-xs">
        <p className="eyebrow">Version</p>
        <h1>
          {detail.version.namespace}/{detail.version.name}@{detail.version.version}
        </h1>
        <p className="lede">{detail.version.description}</p>
        <div className="meta-row">
          <span>Published {new Date(detail.version.publishedAt).toLocaleString()}</span>
          <span>{detail.version.license ?? "No license set"}</span>
        </div>
      </div>

      <div className="artifact-panel stack-sm">
        <h2>Artifacts</h2>
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
      </div>

      <div className="manifest-panel stack-sm">
        <h2>Manifest snapshot</h2>
        <pre>{detail.version.manifestJson}</pre>
      </div>
    </section>
  );
}
