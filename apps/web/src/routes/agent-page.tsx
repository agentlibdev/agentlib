import { Download, Settings2, Star, User } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

import { Breadcrumbs } from "../components/breadcrumbs.js";
import { CompatibilityBadges } from "../components/compatibility-badges.js";
import { PackageSidebar } from "../components/package-sidebar.js";
import { buildAuthStartUrl } from "../lib/api.js";
import { getCompatibilityTargetLabel } from "../lib/compatibility-targets.js";
import { buildAgentPath, buildArtifactPath, buildCreatorPath, buildVersionPath } from "../lib/router.js";
import { buildMarkdownExcerpt } from "../lib/markdown-excerpt.js";
import type { AgentDetailResponse, ArtifactPreviewResponse, SessionResponse } from "../lib/types.js";
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
  latestReadmePreview: ArtifactPreviewResponse | null;
};

export function AgentPage({
  detail,
  onNavigate,
  breadcrumbs,
  session,
  onUpdateLifecycle,
  onRecordMetric,
  onRemoveMetric,
  latestReadmePreview
}: AgentPageProps) {
  const [authNotice, setAuthNotice] = useState<"stars" | "pins" | null>(null);
  const canManageLifecycle = session?.handle === detail.agent.ownerHandle;
  const agentPath = buildAgentPath(detail.agent.namespace, detail.agent.name);
  const builtForTargets = detail.agent.compatibility.targets
    .filter((target) => target.builtFor)
    .map((target) => getCompatibilityTargetLabel(target.targetId));
  const testedTargets = detail.agent.compatibility.targets
    .filter((target) => target.tested)
    .map((target) => getCompatibilityTargetLabel(target.targetId));
  const readmeExcerpt =
    latestReadmePreview?.preview.kind === "markdown"
      ? buildMarkdownExcerpt(latestReadmePreview.preview.text)
      : null;

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
                    <button
                      aria-label={detail.agent.viewer.hasStarred ? "Unstar agent" : "Star agent"}
                      className="rounded-md p-1 transition hover:bg-slate-100 dark:hover:bg-gray-800/70"
                      onClick={() => {
                        if (!session) {
                          setAuthNotice("stars");
                          return;
                        }

                        setAuthNotice(null);
                        void (detail.agent.viewer.hasStarred
                          ? onRemoveMetric(detail.agent.namespace, detail.agent.name, "stars")
                          : onRecordMetric(detail.agent.namespace, detail.agent.name, "stars"));
                      }}
                      type="button"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          detail.agent.viewer.hasStarred
                            ? "fill-violet-500 text-violet-500 dark:fill-violet-400 dark:text-violet-400"
                            : "text-violet-500 dark:text-violet-400"
                        }`}
                      />
                    </button>
                    {detail.agent.starCount}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="eyebrow">Pins</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-slate-950 dark:text-gray-100">
                    <button
                      aria-label={detail.agent.viewer.hasPinned ? "Unpin agent" : "Pin agent"}
                      className="rounded-md p-1 transition hover:bg-slate-100 dark:hover:bg-gray-800/70"
                      onClick={() => {
                        if (!session) {
                          setAuthNotice("pins");
                          return;
                        }

                        setAuthNotice(null);
                        void (detail.agent.viewer.hasPinned
                          ? onRemoveMetric(detail.agent.namespace, detail.agent.name, "pins")
                          : onRecordMetric(detail.agent.namespace, detail.agent.name, "pins"));
                      }}
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        className={`h-5 w-5 ${
                          detail.agent.viewer.hasPinned
                            ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
                            : "text-amber-500 dark:text-amber-400"
                        }`}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M8 3.75a2.25 2.25 0 0 0-2.25 2.25v1.086c0 .534-.184 1.051-.52 1.465L3.5 10.625V12h7.25v8.25l1.25-.938L13.25 12h7.25v-1.375l-1.73-2.069a2.25 2.25 0 0 1-.52-1.465V6A2.25 2.25 0 0 0 16 3.75H8Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                    {detail.agent.pinCount}
                  </p>
                </div>
              </div>

              {authNotice ? (
                <section className="app-panel-muted flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    You need to sign in to {authNotice === "stars" ? "star" : "pin"} agents.
                  </p>
                  <a
                    className="app-button-primary"
                    href={buildAuthStartUrl("github", agentPath)}
                  >
                    Sign in
                  </a>
                </section>
              ) : null}

              <section className="app-panel-muted p-5">
                {latestReadmePreview?.preview.kind === "markdown" ? (
                  <div className="space-y-5">
                    <div>
                      <p className="eyebrow">Latest README</p>
                      <div className="mt-4 artifact-markdown">
                        <ReactMarkdown>{readmeExcerpt?.text ?? latestReadmePreview.preview.text}</ReactMarkdown>
                      </div>
                      {readmeExcerpt?.truncated ? (
                        <button
                          className="mt-4 text-sm font-medium text-cyan-600 transition hover:text-cyan-700 dark:text-cyan-300 dark:hover:text-cyan-200"
                          onClick={() =>
                            onNavigate(
                              buildArtifactPath(
                                detail.agent.namespace,
                                detail.agent.name,
                                detail.agent.latestVersion,
                                "README.md"
                              )
                            )
                          }
                          type="button"
                        >
                          Read more &gt;
                        </button>
                      ) : null}
                    </div>
                    <div className="border-t border-slate-200 pt-5 dark:border-gray-800">
                      <CompatibilityBadges compatibility={detail.agent.compatibility} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="eyebrow">Latest summary</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-gray-300">
                        <p>
                          <span className="font-medium text-slate-900 dark:text-gray-100">
                            {detail.agent.namespace}/{detail.agent.name}
                          </span>{" "}
                          ships as version <span className="font-medium text-slate-900 dark:text-gray-100">v{detail.agent.latestVersion}</span>{" "}
                          and is currently marked <span className="font-medium text-slate-900 dark:text-gray-100">{detail.agent.lifecycleStatus}</span>.
                        </p>
                        <p>
                          Maintained in AgentLib by{" "}
                          <span className="font-medium text-slate-900 dark:text-gray-100">
                            {detail.agent.ownerHandle}
                          </span>
                          {detail.agent.provenance.originalAuthorName &&
                          detail.agent.provenance.originalAuthorName !== detail.agent.ownerHandle
                            ? `, originally authored by ${detail.agent.provenance.originalAuthorName}`
                            : ""}.
                        </p>
                        {builtForTargets.length > 0 ? (
                          <p>
                            Built for{" "}
                            <span className="font-medium text-slate-900 dark:text-gray-100">
                              {builtForTargets.join(", ")}
                            </span>
                            .
                          </p>
                        ) : null}
                        {testedTargets.length > 0 ? (
                          <p>
                            Tested with{" "}
                            <span className="font-medium text-slate-900 dark:text-gray-100">
                              {testedTargets.join(", ")}
                            </span>
                            .
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 pt-5 dark:border-gray-800">
                      <CompatibilityBadges compatibility={detail.agent.compatibility} />
                    </div>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              <PackageSidebar
                license={null}
                name={detail.agent.name}
                namespace={detail.agent.namespace}
                onNavigate={onNavigate}
                ownerHandle={detail.agent.ownerHandle}
                provenance={detail.agent.provenance}
                publishedAt={detail.versions[0]?.publishedAt ?? new Date().toISOString()}
                version={detail.agent.latestVersion}
              />

              <section className="app-panel-muted p-5">
                <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">
                    Actions
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
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
              </section>
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
