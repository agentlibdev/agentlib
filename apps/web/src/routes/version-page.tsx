import { Download, FileJson, PackageCheck, ShieldCheck } from "lucide-react";

import { Breadcrumbs } from "../components/breadcrumbs.js";
import { buildTrackedVersionBundleDownloadUrl } from "../lib/api.js";
import { buildArtifactPath } from "../lib/router.js";
import type { AgentVersionDetailResponse, ArtifactItem, SessionResponse } from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";

type VersionPageProps = {
  detail: AgentVersionDetailResponse;
  artifacts: ArtifactItem[];
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
  session: SessionResponse["session"];
  onRecordDownload: (namespace: string, name: string) => Promise<void>;
};

export function VersionPage({
  detail,
  artifacts,
  breadcrumbs,
  onNavigate,
  onRecordDownload
}: VersionPageProps) {
  const bundleUrl = buildTrackedVersionBundleDownloadUrl(
    detail.version.namespace,
    detail.version.name,
    detail.version.version
  );

  async function handleBundleDownload() {
    await onRecordDownload(detail.version.namespace, detail.version.name);
    window.location.href = bundleUrl;
  }

  return (
    <section className="page-stack">
      <section className="app-panel p-6 sm:p-8">
        <div className="page-stack">
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
          <div className="space-y-3">
            <p className="eyebrow">Version</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-gray-100">
              {detail.version.namespace}/{detail.version.name}@{detail.version.version}
            </h1>
            <p className="lede">{detail.version.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="metric-card">
              <p className="eyebrow">Published</p>
              <p className="mt-3 text-sm font-medium text-slate-900 dark:text-gray-100">
                {new Date(detail.version.publishedAt).toLocaleString()}
              </p>
            </div>
            <div className="metric-card">
              <p className="eyebrow">Owner</p>
              <p className="mt-3 text-sm font-medium text-slate-900 dark:text-gray-100">
                {detail.version.ownerHandle}
              </p>
            </div>
            <div className="metric-card">
              <p className="eyebrow">Status</p>
              <p className="mt-3 text-sm font-medium text-slate-900 dark:text-gray-100">
                {detail.version.lifecycleStatus}
              </p>
            </div>
            <div className="metric-card">
              <p className="eyebrow">License</p>
              <p className="mt-3 text-sm font-medium text-slate-900 dark:text-gray-100">
                {detail.version.license ?? "No license set"}
              </p>
            </div>
          </div>

          <div>
            <button className="app-button-primary" onClick={() => void handleBundleDownload()} type="button">
              <Download className="h-4 w-4" />
              Download ZIP
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="app-panel p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <FileJson className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-gray-100">
                Manifest snapshot
              </h2>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-5 text-sm text-slate-100 dark:border-gray-800 dark:bg-black/30">
              {detail.version.manifestJson}
            </pre>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="app-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">Artifacts</h2>
            </div>
            {artifacts.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-gray-800 dark:text-gray-400">
                No artifacts published for this version.
              </div>
            ) : (
              <div className="space-y-3">
                {artifacts.map((artifact) => (
                  <button
                    key={artifact.path}
                    className="artifact-row"
                    onClick={() =>
                      onNavigate(
                        buildArtifactPath(
                          detail.version.namespace,
                          detail.version.name,
                          detail.version.version,
                          artifact.path
                        )
                      )
                    }
                    type="button"
                  >
                    <span>{artifact.path}</span>
                    <span>
                      {artifact.mediaType} · {artifact.sizeBytes} bytes
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="app-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-violet-500 dark:text-violet-400" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">Package info</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
              <p>Version {detail.version.version}</p>
              <p>Owner {detail.version.ownerHandle}</p>
              <p>Status {detail.version.lifecycleStatus}</p>
              <p>License {detail.version.license ?? "No license set"}</p>
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}
