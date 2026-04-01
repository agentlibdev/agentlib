import { useState } from "react";
import { FolderGit2, PackageCheck, ScrollText } from "lucide-react";

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
    <section className="page-stack">
      <section className="app-panel p-6 sm:p-8">
        <div className="page-stack">
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
          <div className="space-y-3">
            <p className="eyebrow">Import Draft</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {draft.import.manifest.namespace}/{draft.import.manifest.name}@{draft.import.manifest.version}
            </h1>
            <p className="lede">{draft.import.manifest.description}</p>
            <div className="flex flex-wrap gap-3">
              <span className="status-pill">{draft.import.status}</span>
              <span className="app-button-secondary cursor-default">
                {draft.import.repository.owner}/{draft.import.repository.name}
              </span>
              <span className="app-button-secondary cursor-default">{draft.import.repository.resolvedRef}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="app-panel p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
                Repository snapshot
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="metric-card">
                <p className="eyebrow">Repository URL</p>
                <a
                  className="mt-3 block break-all text-sm text-cyan-700 hover:underline dark:text-cyan-300"
                  href={draft.import.repository.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {draft.import.repository.url}
                </a>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Default branch</p>
                <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                  {draft.import.repository.defaultBranch}
                </p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Resolved ref</p>
                <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                  {draft.import.repository.resolvedRef}
                </p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Source repository id</p>
                <p className="mt-3 break-all text-sm font-medium text-slate-900 dark:text-white">
                  {draft.import.sourceRepositoryId}
                </p>
              </div>
            </div>
          </section>

          <section className="app-panel p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-violet-500 dark:text-violet-300" />
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
                README snapshot
              </h2>
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-950 p-5 text-sm text-slate-100 dark:border-white/10 dark:bg-black/30">
              {draft.import.readme}
            </pre>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="app-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Artifacts</h2>
            </div>
            {sortedArtifacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                No artifacts were captured for this draft.
              </div>
            ) : (
              <div className="space-y-3">
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

          <section className="app-panel-muted p-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Publish draft</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {session
                    ? `Ready to publish as ${session.handle}.`
                    : "Sign in first to publish this draft under your namespace."}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  className="app-button-primary"
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
                <button className="app-button-secondary" onClick={() => onNavigate("/imports/new")} type="button">
                  Import another repo
                </button>
              </div>
              {status === "error" ? <div className="inline-error">{errorMessage}</div> : null}
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}
