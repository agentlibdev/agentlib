import { useState } from "react";
import { Download, FileJson, PackageCheck, ShieldCheck } from "lucide-react";

import { ArtifactExplorer } from "../components/artifact-explorer.js";
import { Breadcrumbs } from "../components/breadcrumbs.js";
import { CompatibilityBadges } from "../components/compatibility-badges.js";
import { CompatibilityEditor } from "../components/compatibility-editor.js";
import { PackageSidebar } from "../components/package-sidebar.js";
import { buildTrackedVersionBundleDownloadUrl } from "../lib/api.js";
import { buildManifestSnapshotViewModel } from "../lib/manifest-snapshot.js";
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
  onUpdateCompatibility: (
    namespace: string,
    name: string,
    version: string,
    compatibility: AgentVersionDetailResponse["version"]["compatibility"]
  ) => Promise<void>;
};

export function VersionPage({
  detail,
  artifacts,
  breadcrumbs,
  onNavigate,
  onRecordDownload,
  onUpdateCompatibility,
  session
}: VersionPageProps) {
  const [draftCompatibility, setDraftCompatibility] = useState(detail.version.compatibility);
  const [artifactPathSegments, setArtifactPathSegments] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const bundleUrl = buildTrackedVersionBundleDownloadUrl(
    detail.version.namespace,
    detail.version.name,
    detail.version.version
  );
  const canEditCompatibility = session?.handle === detail.version.ownerHandle;
  const manifestSnapshot = buildManifestSnapshotViewModel(detail.version.manifestJson);

  async function handleBundleDownload() {
    await onRecordDownload(detail.version.namespace, detail.version.name);
    window.location.href = bundleUrl;
  }

  async function handleSaveCompatibility() {
    setSaveState("saving");
    setErrorMessage("");

    try {
      await onUpdateCompatibility(
        detail.version.namespace,
        detail.version.name,
        detail.version.version,
        draftCompatibility
      );
      setSaveState("idle");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : "Compatibility update failed");
    }
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
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-black/20">
                  <p className="eyebrow">Kind</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-gray-100">
                    {manifestSnapshot.kind ?? "Unknown"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-black/20">
                  <p className="eyebrow">API Version</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-gray-100">
                    {manifestSnapshot.apiVersion ?? "Unknown"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-black/20">
                  <p className="eyebrow">Package</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-gray-100">
                    {manifestSnapshot.namespace && manifestSnapshot.name
                      ? `${manifestSnapshot.namespace}/${manifestSnapshot.name}`
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {manifestSnapshot.summary || manifestSnapshot.description || manifestSnapshot.title ? (
                <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-black/10">
                  {manifestSnapshot.title ? (
                    <p className="text-base font-semibold text-slate-950 dark:text-gray-100">
                      {manifestSnapshot.title}
                    </p>
                  ) : null}
                  {manifestSnapshot.description ? (
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                      {manifestSnapshot.description}
                    </p>
                  ) : null}
                  {manifestSnapshot.summary ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-gray-400">
                      {manifestSnapshot.summary}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-800">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:border-gray-800 dark:bg-black/20 dark:text-gray-500">
                  Raw manifest
                </div>
                <pre className="overflow-x-auto bg-slate-950 p-5 text-sm leading-6 text-slate-100 dark:bg-black/30">
                  {manifestSnapshot.formattedJson}
                </pre>
              </div>
            </div>
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
              <ArtifactExplorer
                artifacts={artifacts}
                onNavigateToDirectory={setArtifactPathSegments}
                onOpenArtifact={(path) =>
                  onNavigate(
                    buildArtifactPath(
                      detail.version.namespace,
                      detail.version.name,
                      detail.version.version,
                      path
                    )
                  )
                }
                pathSegments={artifactPathSegments}
                rootLabel={`${detail.version.namespace}/${detail.version.name}`}
              />
            )}
          </section>

          <PackageSidebar
            extraContent={
              <div className="space-y-5">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">
                      Compatibility
                    </h2>
                  </div>
                  <CompatibilityBadges compatibility={detail.version.compatibility} compact />
                </div>
                {canEditCompatibility ? (
                  <div className="space-y-4 border-t border-slate-200 pt-5 dark:border-gray-800">
                    <div>
                      <p className="eyebrow">Edit compatibility</p>
                    </div>
                    <CompatibilityEditor
                      compatibility={draftCompatibility}
                      onChange={setDraftCompatibility}
                    />
                    <button
                      className="app-button-secondary"
                      disabled={saveState === "saving"}
                      onClick={() => void handleSaveCompatibility()}
                      type="button"
                    >
                      {saveState === "saving" ? "Saving..." : "Save compatibility"}
                    </button>
                    {saveState === "error" ? <div className="inline-error">{errorMessage}</div> : null}
                  </div>
                ) : null}
              </div>
            }
            license={detail.version.license}
            name={detail.version.name}
            namespace={detail.version.namespace}
            onNavigate={onNavigate}
            ownerHandle={detail.version.ownerHandle}
            provenance={detail.version.provenance}
            publishedAt={detail.version.publishedAt}
            version={detail.version.version}
          />
        </aside>
      </section>
    </section>
  );
}
