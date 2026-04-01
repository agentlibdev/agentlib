import { Download, Pin, Sparkles, Star } from "lucide-react";

import { Breadcrumbs } from "../components/breadcrumbs.js";
import { buildAgentPath } from "../lib/router.js";
import type { AgentListItem } from "../lib/types.js";
import type { Breadcrumb, CreatorRank } from "../lib/view-models.js";

type CreatorPageProps = {
  handle: string;
  agents: AgentListItem[];
  creator: CreatorRank | null;
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
};

export function CreatorPage({
  handle,
  agents,
  creator,
  breadcrumbs,
  onNavigate
}: CreatorPageProps) {
  return (
    <section className="page-stack">
      <section className="app-panel p-6 sm:p-8">
        <div className="page-stack">
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
          <div className="space-y-3">
            <p className="eyebrow">Creator</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {handle}
            </h1>
            <p className="lede">
              {creator
                ? `${creator.agentCount} agents · ${creator.totalDownloads} downloads · ${creator.totalStars} stars`
                : "No published agents yet."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <div className="metric-card">
          <p className="eyebrow">Agents</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
            {creator?.agentCount ?? 0}
          </p>
        </div>
        <div className="metric-card">
          <p className="eyebrow">Downloads</p>
          <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-slate-950 dark:text-white">
            <Download className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
            {creator?.totalDownloads ?? 0}
          </p>
        </div>
        <div className="metric-card">
          <p className="eyebrow">Stars</p>
          <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-slate-950 dark:text-white">
            <Star className="h-5 w-5 text-violet-500 dark:text-violet-300" />
            {creator?.totalStars ?? 0}
          </p>
        </div>
        <div className="metric-card">
          <p className="eyebrow">Pins</p>
          <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-slate-950 dark:text-white">
            <Pin className="h-5 w-5 text-amber-500 dark:text-amber-300" />
            {creator?.totalPins ?? 0}
          </p>
        </div>
      </section>

      <section className="app-panel p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
              Published catalog
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Packages owned by this creator in the registry.
            </p>
          </div>
          <span className="status-pill">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            {agents.length} items
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {agents.map((agent) => (
            <button
              key={`${agent.namespace}/${agent.name}`}
              className="group rounded-2xl border border-slate-200/80 bg-white/80 p-6 text-left shadow-card transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-glow dark:border-white/10 dark:bg-chrome-900/75 dark:hover:border-cyan-400/30"
              onClick={() => onNavigate(buildAgentPath(agent.namespace, agent.name))}
              type="button"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
                      {agent.namespace}/{agent.name}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950 transition group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-300">
                      {agent.title}
                    </h3>
                  </div>
                  <span className="status-pill">v{agent.latestVersion}</span>
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {agent.description}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span>{agent.downloadCount} downloads</span>
                  <span>{agent.starCount} stars</span>
                  <span>{agent.pinCount} pins</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
