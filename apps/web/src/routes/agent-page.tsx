import { Download, Pin, Settings2, Star, User } from "lucide-react";

import { Breadcrumbs } from "../components/breadcrumbs.js";
import { buildCreatorPath, buildVersionPath } from "../lib/router.js";
import type { AgentDetailResponse, SessionResponse } from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";

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
    <section className="page-stack">
      <section className="app-panel overflow-hidden p-6 sm:p-8">
        <div className="page-stack">
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="eyebrow">Agent</p>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-gray-100">
                  {detail.agent.namespace}/{detail.agent.name}
                </h1>
                <p className="lede">
                  Track ownership, traction, lifecycle, and every published version from one
                  package surface.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="status-pill">v{detail.agent.latestVersion}</span>
                <button
                  className="app-button-secondary"
                  onClick={() => onNavigate(buildCreatorPath(detail.agent.ownerHandle))}
                  type="button"
                >
                  <User className="h-4 w-4" />
                  {detail.agent.ownerHandle}
                </button>
                <span className="app-button-secondary cursor-default">{detail.agent.lifecycleStatus}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="metric-card">
                  <p className="eyebrow">Downloads</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-slate-950 dark:text-gray-100">
                    <Download className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                    {detail.agent.downloadCount}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="eyebrow">Stars</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-slate-950 dark:text-gray-100">
                    <Star className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                    {detail.agent.starCount}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="eyebrow">Pins</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-slate-950 dark:text-gray-100">
                    <Pin className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                    {detail.agent.pinCount}
                  </p>
                </div>
              </div>
            </div>

            <aside className="app-panel-muted p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">
                    Actions
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    className="app-button-secondary"
                    disabled={!session}
                    onClick={() =>
                      void (detail.agent.viewer.hasStarred
                        ? onRemoveMetric(detail.agent.namespace, detail.agent.name, "stars")
                        : onRecordMetric(detail.agent.namespace, detail.agent.name, "stars"))
                    }
                    type="button"
                  >
                    {!session ? "Sign in to star" : detail.agent.viewer.hasStarred ? "Starred" : "Star"}
                  </button>
                  <button
                    className="app-button-secondary"
                    disabled={!session}
                    onClick={() =>
                      void (detail.agent.viewer.hasPinned
                        ? onRemoveMetric(detail.agent.namespace, detail.agent.name, "pins")
                        : onRecordMetric(detail.agent.namespace, detail.agent.name, "pins"))
                    }
                    type="button"
                  >
                    {!session ? "Sign in to pin" : detail.agent.viewer.hasPinned ? "Pinned" : "Pin"}
                  </button>
                  {canManageLifecycle ? (
                    <>
                      <button
                        className="app-button-secondary"
                        onClick={() => void onUpdateLifecycle(detail.agent.namespace, detail.agent.name, "active")}
                        type="button"
                      >
                        Mark active
                      </button>
                      <button
                        className="app-button-secondary"
                        onClick={() => void onUpdateLifecycle(detail.agent.namespace, detail.agent.name, "deprecated")}
                        type="button"
                      >
                        Mark deprecated
                      </button>
                      <button
                        className="app-button-secondary"
                        onClick={() =>
                          void onUpdateLifecycle(detail.agent.namespace, detail.agent.name, "unmaintained")
                        }
                        type="button"
                      >
                        Mark unmaintained
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="app-panel p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-gray-100">Versions</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Immutable published versions for this package.
            </p>
          </div>
          <span className="status-pill">{detail.versions.length} versions</span>
        </div>

        <div className="space-y-4">
          {detail.versions.map((version) => (
            <button
              key={version.version}
              className="artifact-row"
              onClick={() =>
                onNavigate(buildVersionPath(detail.agent.namespace, detail.agent.name, version.version))
              }
              type="button"
            >
              <div>
                <p className="text-base font-semibold text-slate-950 dark:text-gray-100">{version.version}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{version.title}</p>
              </div>
              <div className="max-w-sm text-right text-sm text-slate-500 dark:text-gray-400">
                <p>{new Date(version.publishedAt).toLocaleString()}</p>
                <p className="mt-1">{version.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
