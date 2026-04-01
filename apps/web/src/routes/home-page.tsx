import { useDeferredValue, useMemo, useState } from "react";
import {
  Bot,
  Download,
  Filter,
  Pin,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  User
} from "lucide-react";

import {
  buildAgentPath,
  buildCreatorPath,
  buildImportNewPath,
  buildManualPublishPath
} from "../lib/router.js";
import type { AgentListItem, RegistryHighlightsResponse, SessionResponse } from "../lib/types.js";
import { filterAgents, rankCreators } from "../lib/view-models.js";

type HomePageProps = {
  agents: AgentListItem[];
  highlights: RegistryHighlightsResponse;
  onNavigate: (path: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  session: SessionResponse["session"];
};

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

export function HomePage({
  agents,
  highlights,
  onNavigate,
  query,
  onQueryChange,
  session
}: HomePageProps) {
  const [selectedOwner, setSelectedOwner] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const deferredQuery = useDeferredValue(query);

  const owners = useMemo(
    () => Array.from(new Set(agents.map((agent) => agent.ownerHandle))).sort(),
    [agents]
  );

  const filteredAgents = useMemo(() => {
    return filterAgents(agents, deferredQuery).filter((agent) => {
      const matchesOwner = selectedOwner === "" || agent.ownerHandle === selectedOwner;
      const matchesStatus = selectedStatus === "" || agent.lifecycleStatus === selectedStatus;
      return matchesOwner && matchesStatus;
    });
  }, [agents, deferredQuery, selectedOwner, selectedStatus]);

  const topCreators = useMemo(() => rankCreators(agents).slice(0, 5), [agents]);
  const trendingAgents = useMemo(
    () => [...highlights.highlights.topAgents].sort((left, right) => right.downloadCount - left.downloadCount),
    [highlights]
  );

  return (
    <section className="page-stack">
      <section className="home-hero px-2 pt-6 sm:px-4 lg:px-0">
        <div className="mb-6 flex items-center gap-2">
          <span className="eyebrow inline-flex items-center gap-2 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            Registry index
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="max-w-4xl text-4xl font-bold text-slate-950 dark:text-gray-100 sm:text-5xl">
            Discover AI Agents
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-gray-400">
            Search published packages, filter by owner and status, and move straight into imports
            or manual publishing.
          </p>
        </div>
        <div className="relative mt-8 w-full max-w-4xl">
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 opacity-25 blur transition duration-300 group-hover:opacity-40 dark:opacity-30" />
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-4 h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              <input
                className="home-search-input"
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search agents..."
                type="search"
                value={query}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <aside className="app-panel-muted h-max p-6">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-gray-100">
            <Filter className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
            <span className="text-cyan-600 dark:text-cyan-400">Filters</span>
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Status
              </h3>
              <div className="space-y-2">
                {["", "active", "deprecated", "unmaintained"].map((status) => (
                  <button
                    key={`status-${status || "all"}`}
                    className={`filter-button ${
                      selectedStatus === status ? "filter-button-active" : "filter-button-idle"
                    }`}
                    onClick={() => setSelectedStatus(status)}
                    type="button"
                  >
                    {status === "" ? "All" : status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Owners
              </h3>
              <div className="space-y-2">
                <button
                  className={`filter-button ${
                    selectedOwner === "" ? "filter-button-active" : "filter-button-idle"
                  }`}
                  onClick={() => setSelectedOwner("")}
                  type="button"
                >
                  All
                </button>
                {owners.map((owner) => (
                  <button
                    key={owner}
                    className={`filter-button ${
                      selectedOwner === owner ? "filter-button-active" : "filter-button-idle"
                    }`}
                    onClick={() => setSelectedOwner(owner)}
                    type="button"
                  >
                    {owner}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 dark:text-gray-100">
                Discover AI Agents
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredAgents.length} agents available
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="app-button-secondary"
                onClick={() => onNavigate(buildImportNewPath())}
                type="button"
              >
                {session ? "Start import" : "Sign in to import"}
              </button>
              <button
                className="app-button-primary"
                onClick={() => onNavigate(buildManualPublishPath())}
                type="button"
              >
                {session ? "Create manually" : "Sign in to create"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredAgents.map((agent) => (
              <button
                key={`${agent.namespace}/${agent.name}`}
                className="catalog-card group"
                onClick={() => onNavigate(buildAgentPath(agent.namespace, agent.name))}
                type="button"
              >
                <div className="relative">
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-slate-950 transition-colors group-hover:text-cyan-600 dark:text-gray-100 dark:group-hover:text-cyan-400">
                      {agent.title}
                    </h3>
                    <span className="status-pill">v{agent.latestVersion}</span>
                  </div>

                  <div className="mb-3 flex items-center text-sm text-slate-500 dark:text-gray-400">
                    <User className="mr-1 h-4 w-4" />
                    <span>{agent.ownerHandle}</span>
                  </div>

                  <p className="mb-4 text-sm text-slate-700 dark:text-gray-300">{agent.description}</p>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="tag-pill">{agent.lifecycleStatus}</span>
                    <span className="tag-pill">{agent.namespace}</span>
                    <span className="tag-pill">portable</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Download className="mr-1 h-4 w-4" />
                      <span>{formatCompactNumber(agent.downloadCount)}</span>
                    </div>
                    <div className="flex items-center">
                      <Star className="mr-1 h-4 w-4" />
                      <span>{formatCompactNumber(agent.starCount)}</span>
                    </div>
                    <div className="flex items-center">
                      <Pin className="mr-1 h-4 w-4" />
                      <span>{formatCompactNumber(agent.pinCount)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredAgents.length === 0 ? (
            <div className="app-panel p-16 text-center">
              <div className="text-slate-400 dark:text-gray-500">
                <Bot className="mx-auto mb-4 h-16 w-16 opacity-50" />
                <p className="text-lg">No agents found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="app-panel-muted p-6">
            <div className="mb-4 flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">
                Trending Today
              </h2>
            </div>

            <div className="space-y-3">
              {trendingAgents.slice(0, 5).map((agent, index) => (
                <button
                  key={`trending-${agent.namespace}/${agent.name}`}
                  className="aside-list-row"
                  onClick={() => onNavigate(buildAgentPath(agent.namespace, agent.name))}
                  type="button"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-slate-950 dark:text-gray-100">
                      {agent.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      {agent.ownerHandle}
                    </p>
                  </div>
                  <div className="accent-number">{formatCompactNumber(agent.downloadCount)}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="app-panel-muted p-6">
            <div className="mb-4 flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">
                Registry Snapshot
              </h2>
            </div>
            <div className="space-y-3">
              <div className="metric-card">
                <p className="eyebrow">Agents</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-gray-100">
                  {highlights.highlights.stats.totalAgents}
                </p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Downloads</p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-gray-100">
                  {formatCompactNumber(highlights.highlights.stats.totalDownloads)}
                </p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Stars / Pins</p>
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-gray-300">
                  {formatCompactNumber(highlights.highlights.stats.totalStars)} stars
                  <br />
                  {formatCompactNumber(highlights.highlights.stats.totalPins)} pins
                </p>
              </div>
            </div>
          </section>

          <section className="app-panel-muted p-6">
            <div className="mb-4 flex items-center">
              <User className="mr-2 h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">
                Top Creators
              </h2>
            </div>
            <div className="space-y-3">
              {topCreators.map((creator) => (
                <button
                  key={`creator-${creator.handle}`}
                  className="aside-list-row items-start justify-between"
                  onClick={() => onNavigate(buildCreatorPath(creator.handle))}
                  type="button"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-950 dark:text-gray-100">
                      {creator.handle}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      {creator.agentCount} agents
                    </p>
                  </div>
                  <div className="accent-number">{formatCompactNumber(creator.totalDownloads)}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}
