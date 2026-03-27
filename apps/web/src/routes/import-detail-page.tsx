import { useState } from "react";

import { Breadcrumbs } from "../components/breadcrumbs.js";
import type { ImportDraftResponse, SessionResponse } from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";
import { canPublishImportDraft, sortImportArtifacts } from "../lib/view-models.js";

type ImportDetailPageProps = {
  draft: ImportDraftResponse;
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
  onPublishDraft: (importId: string) => Promise<void>;
  session: SessionResponse["session"];
};

export function ImportDetailPage({
  draft,
  breadcrumbs,
  onNavigate,
  onPublishDraft,
  session
}: ImportDetailPageProps) {
  const [status, setStatus] = useState<"idle" | "publishing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handlePublish() {
    setStatus("publishing");
    setErrorMessage("");

    try {
      await onPublishDraft(draft.import.id);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown publish error");
    }
  }

  const sortedArtifacts = sortImportArtifacts(draft.import);
  const publishable = canPublishImportDraft(draft.import);

  return (
    <section className="panel stack-lg">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />

      <div className="stack-xs">
        <p className="eyebrow">Import Draft</p>
        <h1>
          {draft.import.manifest.namespace}/{draft.import.manifest.name}@
          {draft.import.manifest.version}
        </h1>
        <p className="lede">{draft.import.manifest.description}</p>
        <div className="meta-row">
          <span>{draft.import.provider}</span>
          <span>{draft.import.repository.owner}/{draft.import.repository.name}</span>
          <span>{draft.import.repository.resolvedRef}</span>
          <span className={`status-pill status-${draft.import.status}`}>{draft.import.status}</span>
        </div>
      </div>

      <div className="split-layout">
        <section className="stack-sm">
          <h2>Repository</h2>
          <div className="detail-list">
            <p>
              <strong>URL</strong>
              <a href={draft.import.repository.url} rel="noreferrer" target="_blank">
                {draft.import.repository.url}
              </a>
            </p>
            <p>
              <strong>Default branch</strong>
              <span>{draft.import.repository.defaultBranch}</span>
            </p>
            <p>
              <strong>Resolved ref</strong>
              <span>{draft.import.repository.resolvedRef}</span>
            </p>
            <p>
              <strong>Source repository id</strong>
              <span>{draft.import.sourceRepositoryId}</span>
            </p>
          </div>
        </section>

        <section className="stack-sm">
          <h2>Manifest snapshot</h2>
          <div className="detail-list">
            <p>
              <strong>Title</strong>
              <span>{draft.import.manifest.title}</span>
            </p>
            <p>
              <strong>Namespace</strong>
              <span>{draft.import.manifest.namespace}</span>
            </p>
            <p>
              <strong>Name</strong>
              <span>{draft.import.manifest.name}</span>
            </p>
            <p>
              <strong>Version</strong>
              <span>{draft.import.manifest.version}</span>
            </p>
          </div>
        </section>
      </div>

      <section className="artifact-panel stack-sm">
        <div className="section-head">
          <h2>Imported artifacts</h2>
          <span>{sortedArtifacts.length} files</span>
        </div>
        {sortedArtifacts.length === 0 ? (
          <div className="empty-state inset-empty stack-sm">
            <p className="eyebrow">Empty</p>
            <h2>No artifacts were captured for this draft.</h2>
          </div>
        ) : (
          <div className="artifact-list">
            {sortedArtifacts.map((artifact) => (
              <div className="artifact-row" key={artifact.path}>
                <span>{artifact.path}</span>
                <span>
                  {artifact.mediaType} · {artifact.sizeBytes} bytes
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="manifest-panel stack-sm">
        <div className="section-head">
          <h2>README snapshot</h2>
          <span>Imported from GitHub</span>
        </div>
        <pre>{draft.import.readme}</pre>
      </section>

      <section className="stack-sm">
        {session ? null : (
          <p className="toolbar-meta">Sign in first to publish this draft under your namespace.</p>
        )}
        <div className="action-row">
          <button
            className="primary-action"
            disabled={!publishable || status === "publishing" || !session}
            onClick={() => void handlePublish()}
            type="button"
          >
            {draft.import.status === "published"
              ? "Already published"
              : status === "publishing"
                ? "Publishing..."
                : "Publish draft"}
          </button>
          <button className="secondary-action" onClick={() => onNavigate("/imports/new")} type="button">
            Import another repo
          </button>
        </div>

        {status === "error" ? (
          <div className="inline-error">
            <strong>Publish failed.</strong>
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </section>
    </section>
  );
}
