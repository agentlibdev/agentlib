import { startTransition, useEffect, useEffectEvent, useState } from "react";
import {
  Bot,
  Compass,
  LogOut,
  Moon,
  Search,
  Sparkles,
  SunMedium,
  UserCircle2
} from "lucide-react";

import {
  buildAuthStartUrl,
  createGithubImport,
  fetchAccountSummary,
  fetchAgent,
  fetchArtifactPreview,
  fetchAgents,
  fetchArtifacts,
  fetchRegistryHighlights,
  fetchSession,
  fetchAgentVersion,
  fetchImportDraft,
  recordAgentMetric,
  removeAgentMetric,
  logoutSession,
  publishAgent,
  publishImportDraft,
  updateAccountProfile,
  updateAgentLifecycle
} from "./lib/api.js";
import {
  buildAgentPath,
  buildAccountPath,
  buildCreatorPath,
  buildImportDetailPath,
  buildImportNewPath,
  buildManualPublishPath,
  buildVersionPath,
  matchRoute
} from "./lib/router.js";
import type {
  AgentDetailResponse,
  AgentListResponse,
  AgentVersionDetailResponse,
  ArtifactListResponse,
  ArtifactPreviewResponse,
  ImportDraftResponse,
  PublishRequest,
  SessionResponse,
  AccountSummaryResponse,
  RegistryHighlightsResponse
} from "./lib/types.js";
import type { Theme } from "./lib/theme.js";
import { nextTheme, resolveInitialTheme } from "./lib/theme.js";
import { AccountPage } from "./routes/account-page.js";
import { HomePage } from "./routes/home-page.js";
import { AgentPage } from "./routes/agent-page.js";
import { CreatorPage } from "./routes/creator-page.js";
import { ImportDetailPage } from "./routes/import-detail-page.js";
import { ImportNewPage } from "./routes/import-new-page.js";
import { ManualPublishPage } from "./routes/manual-publish-page.js";
import { VersionPage } from "./routes/version-page.js";
import { ArtifactPage } from "./routes/artifact-page.js";
import { buildBreadcrumbs, rankCreators } from "./lib/view-models.js";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready-home";
      agents: AgentListResponse["items"];
      highlights: RegistryHighlightsResponse;
      session: SessionResponse["session"];
    }
  | { status: "ready"; view: React.ReactNode };

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M21.8 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.59Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.3-2.56c-.91.61-2.08.97-3.47.97-2.67 0-4.94-1.8-5.75-4.22H2.84v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.25 13.72A5.98 5.98 0 0 1 5.93 12c0-.6.11-1.18.32-1.72V7.64H2.84A10 10 0 0 0 2 12c0 1.61.39 3.13 1.09 4.36l3.16-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.06c1.5 0 2.84.51 3.9 1.52l2.92-2.92C17.07 3.03 14.76 2 12 2A10 10 0 0 0 3.09 7.64l3.16 2.64c.81-2.42 3.08-4.22 5.75-4.22Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 fill-slate-700 dark:fill-gray-200"
      viewBox="0 0 24 24"
    >
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.72.08-.72 1.2.09 1.84 1.24 1.84 1.24 1.08 1.84 2.82 1.31 3.5 1 .11-.79.42-1.31.76-1.61-2.67-.31-5.47-1.33-5.47-5.9 0-1.3.47-2.37 1.24-3.2-.12-.31-.54-1.57.12-3.27 0 0 1.01-.32 3.3 1.22a11.4 11.4 0 0 1 6 0c2.28-1.54 3.29-1.22 3.29-1.22.66 1.7.24 2.96.12 3.27.77.83 1.24 1.9 1.24 3.2 0 4.58-2.8 5.59-5.48 5.89.43.37.82 1.1.82 2.22v3.29c0 .32.21.69.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function readPreferredTheme(): Theme {
  return resolveInitialTheme(
    window.localStorage.getItem("agentlib-theme"),
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useEffectEvent((nextPath: string) => {
    startTransition(() => {
      window.history.pushState({}, "", nextPath);
      setPathname(nextPath);
    });
  });

  return { pathname, navigate };
}

export function App() {
  const { pathname, navigate } = usePathname();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [session, setSession] = useState<SessionResponse["session"]>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setTheme] = useState<Theme>(() => readPreferredTheme());
  const [homeQuery, setHomeQuery] = useState("");
  const [isHeaderSearchCompact, setIsHeaderSearchCompact] = useState(false);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);

  const isHomeRoute = pathname === "/";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("agentlib-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isHomeRoute) {
      setIsHeaderSearchCompact(false);
      return;
    }

    const syncScrollState = () => {
      setIsHeaderSearchCompact(window.scrollY > 120);
    };

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });
    return () => window.removeEventListener("scroll", syncScrollState);
  }, [isHomeRoute]);

  useEffect(() => {
    if (!isAuthMenuOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-auth-menu-root]")) {
        setIsAuthMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAuthMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAuthMenuOpen]);

  async function handleCreateImport(payload: { repositoryUrl: string; ref?: string }) {
    const result = await createGithubImport(payload);
    navigate(buildImportDetailPath(result.import.id));
  }

  async function handlePublishDraft(importId: string) {
    const result = await publishImportDraft(importId);
    navigate(buildVersionPath(result.agent.namespace, result.agent.name, result.agent.version));
  }

  async function handleManualPublish(payload: PublishRequest) {
    const result = await publishAgent(payload);
    navigate(buildVersionPath(result.agent.namespace, result.agent.name, result.agent.version));
  }

  async function handleUpdateLifecycle(
    namespace: string,
    name: string,
    lifecycleStatus: "active" | "deprecated" | "unmaintained"
  ) {
    await updateAgentLifecycle(namespace, name, lifecycleStatus);
    setRefreshKey((value) => value + 1);
  }

  async function handleUpdateProfile(payload: Parameters<typeof updateAccountProfile>[0]) {
    await updateAccountProfile(payload);
    setRefreshKey((value) => value + 1);
  }

  async function handleRecordMetric(
    namespace: string,
    name: string,
    action: "pins" | "stars"
  ) {
    await recordAgentMetric(namespace, name, action);
    setRefreshKey((value) => value + 1);
  }

  async function handleRemoveMetric(
    namespace: string,
    name: string,
    action: "pins" | "stars"
  ) {
    await removeAgentMetric(namespace, name, action);
    setRefreshKey((value) => value + 1);
  }

  async function handleRecordDownload(namespace: string, name: string) {
    await recordAgentMetric(namespace, name, "downloads");
    setRefreshKey((value) => value + 1);
  }

  async function handleLogout() {
    await logoutSession();
    setSession(null);
    navigate("/");
    setRefreshKey((value) => value + 1);
  }

  function handleToggleAuthMenu() {
    setIsAuthMenuOpen((current) => !current);
  }

  function handleCloseAuthMenu() {
    setIsAuthMenuOpen(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      const route = matchRoute(pathname);

      try {
        const currentSession = (await fetchSession()).session;
        if (!cancelled) {
          setSession(currentSession);
        }

        if (route.name === "home") {
          const [agents, highlights]: [AgentListResponse, RegistryHighlightsResponse] =
            await Promise.all([fetchAgents(), fetchRegistryHighlights()]);
          if (!cancelled) {
            setState({
              status: "ready-home",
              agents: agents.items,
              highlights,
              session: currentSession
            });
          }
          return;
        }

        if (route.name === "account") {
          const account: AccountSummaryResponse = await fetchAccountSummary();
          if (!cancelled) {
            setState({
              status: "ready",
              view: (
                <AccountPage
                  account={account}
                  breadcrumbs={buildBreadcrumbs(route)}
                  onNavigate={navigate}
                  onUpdateProfile={handleUpdateProfile}
                  onUpdateLifecycle={handleUpdateLifecycle}
                />
              )
            });
          }
          return;
        }

        if (route.name === "creator") {
          const agents: AgentListResponse = await fetchAgents();
          const ownedAgents = agents.items.filter((agent) => agent.ownerHandle === route.handle);
          const creator = rankCreators(ownedAgents)[0] ?? null;
          if (!cancelled) {
            setState({
              status: "ready",
              view: (
                <CreatorPage
                  agents={ownedAgents}
                  breadcrumbs={buildBreadcrumbs(route)}
                  creator={creator}
                  handle={route.handle}
                  onNavigate={navigate}
                />
              )
            });
          }
          return;
        }

        if (route.name === "import-new") {
          setState({
            status: "ready",
            view: (
              <ImportNewPage
                onCreateImport={handleCreateImport}
                onNavigate={navigate}
                session={currentSession}
              />
            )
          });
          return;
        }

        if (route.name === "import-detail") {
          const draft: ImportDraftResponse = await fetchImportDraft(route.importId);
          if (!cancelled) {
            setState({
              status: "ready",
              view: (
                <ImportDetailPage
                  breadcrumbs={buildBreadcrumbs(route)}
                  draft={draft}
                  onNavigate={navigate}
                  onPublishDraft={handlePublishDraft}
                  session={currentSession}
                />
              )
            });
          }
          return;
        }

        if (route.name === "manual-publish") {
          setState({
            status: "ready",
            view: (
              <ManualPublishPage
                onNavigate={navigate}
                onPublish={handleManualPublish}
                session={currentSession}
              />
            )
          });
          return;
        }

        if (route.name === "agent") {
          const detail: AgentDetailResponse = await fetchAgent(route.namespace, route.nameParam);
          if (!cancelled) {
            setState({
              status: "ready",
              view: (
                <AgentPage
                  breadcrumbs={buildBreadcrumbs(route)}
                  detail={detail}
                  onRecordMetric={handleRecordMetric}
                  onRemoveMetric={handleRemoveMetric}
                  onUpdateLifecycle={handleUpdateLifecycle}
                  onNavigate={navigate}
                  session={currentSession}
                />
              )
            });
          }
          return;
        }

        if (route.name === "version") {
          const [detail, artifacts]: [AgentVersionDetailResponse, ArtifactListResponse] =
            await Promise.all([
              fetchAgentVersion(route.namespace, route.nameParam, route.version),
              fetchArtifacts(route.namespace, route.nameParam, route.version)
            ]);

          if (!cancelled) {
            setState({
              status: "ready",
              view: (
                <VersionPage
                  artifacts={artifacts.items}
                  breadcrumbs={buildBreadcrumbs(route)}
                  detail={detail}
                  onNavigate={navigate}
                  onRecordDownload={handleRecordDownload}
                  session={currentSession}
                />
              )
            });
          }
          return;
        }

        if (route.name === "artifact") {
          const [detail, preview]: [AgentVersionDetailResponse, ArtifactPreviewResponse] =
            await Promise.all([
              fetchAgentVersion(route.namespace, route.nameParam, route.version),
              fetchArtifactPreview(
                route.namespace,
                route.nameParam,
                route.version,
                route.artifactPath
              )
            ]);

          if (!cancelled) {
            setState({
              status: "ready",
              view: (
                <ArtifactPage
                  breadcrumbs={buildBreadcrumbs(route)}
                  detail={detail}
                  onNavigate={navigate}
                  onRecordDownload={handleRecordDownload}
                  preview={preview}
                />
              )
            });
          }
          return;
        }

        setState({
          status: "ready",
          view: (
            <section className="app-panel p-8 sm:p-10">
              <div className="page-stack">
                <p className="eyebrow">Not Found</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  This route does not map to an agent page.
                </h1>
                <p className="lede">
                  Go back to the registry and pick an existing agent, version, or import draft.
                </p>
                <div>
                  <button className="app-button-primary" onClick={() => navigate("/")} type="button">
                    <Compass className="h-4 w-4" />
                    Back to registry
                  </button>
                </div>
              </div>
            </section>
          )
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown web error"
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [pathname, refreshKey]);

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="app-container py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <button
              className="flex items-center gap-3 text-left"
              onClick={() => navigate("/")}
              type="button"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-cyan-500 blur-lg opacity-35 dark:opacity-50" />
                <Bot className="relative h-8 w-8 text-cyan-500 dark:text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
                    AgentLib
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-gray-400">AI Agent Registry</p>
              </div>
            </button>

            <div
              className={`header-search-shell ${
                isHomeRoute && isHeaderSearchCompact
                  ? "header-search-shell-visible"
                  : "header-search-shell-hidden"
              }`}
            >
              <div className="header-search-compact">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500 dark:text-cyan-400" />
                <input
                  aria-label="Search agents"
                  className="header-search-input-compact"
                  onChange={(event) => setHomeQuery(event.target.value)}
                  placeholder="Search agents..."
                  type="search"
                  value={homeQuery}
                />
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm lg:gap-4">
              <button
                className="border-0 bg-transparent px-0 py-0 text-slate-600 transition-colors hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400"
                onClick={() => navigate("/")}
                type="button"
              >
                Explore
              </button>
              <a
                className="text-slate-600 transition-colors hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400"
                href="https://github.com/agentlibdev/agentlib#readme"
              >
                Documentation
              </a>
              <button
                className="border-0 bg-transparent px-0 py-0 text-slate-600 transition-colors hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400"
                onClick={() => navigate(buildManualPublishPath())}
                type="button"
              >
                Publish
              </button>
              <button
                aria-label="Toggle color theme"
                className="app-button-secondary px-3"
                onClick={() => setTheme((current) => nextTheme(current))}
                type="button"
              >
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {session ? (
                <>
                  <button
                    className="app-button-secondary"
                    onClick={() => navigate(buildAccountPath())}
                    type="button"
                  >
                    <UserCircle2 className="h-4 w-4" />
                    {session.handle}
                  </button>
                  <button className="app-button-primary" onClick={() => void handleLogout()} type="button">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="relative" data-auth-menu-root="true">
                  <button className="app-button-primary" onClick={handleToggleAuthMenu} type="button">
                    <Sparkles className="h-4 w-4" />
                    Sign in
                  </button>
                  {isAuthMenuOpen ? (
                    <div className="auth-menu-popover">
                      <div className="mb-3 space-y-1">
                        <p className="eyebrow">Sign In</p>
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                          Choose a provider
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <a
                          className="auth-provider-button"
                          href={buildAuthStartUrl("google", pathname)}
                          onClick={handleCloseAuthMenu}
                        >
                          <GoogleMark />
                          <span>Google</span>
                        </a>
                        <a
                          className="auth-provider-button"
                          href={buildAuthStartUrl("github", pathname)}
                          onClick={handleCloseAuthMenu}
                        >
                          <GitHubMark />
                          <span>GitHub</span>
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="app-container py-6 sm:py-8">
        {state.status === "loading" ? (
          <section className="app-panel overflow-hidden p-8 sm:p-10">
            <div className="page-stack">
              <p className="eyebrow">Loading</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Fetching registry state.
              </h1>
              <p className="lede">
                Loading the current catalog, account state, and package detail views from the API.
              </p>
            </div>
          </section>
        ) : null}

        {state.status === "error" ? (
          <section className="app-panel overflow-hidden p-8 sm:p-10">
            <div className="page-stack">
              <p className="eyebrow">Error</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Could not load this page.
              </h1>
              <p className="inline-error">{state.message}</p>
              <div>
                <button
                  className="app-button-primary"
                  onClick={() => navigate(buildAgentPath("raul", "code-reviewer"))}
                  type="button"
                >
                  Open sample agent
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {state.status === "ready" ? state.view : null}

        {state.status === "ready-home" ? (
          <HomePage
            agents={state.agents}
            highlights={state.highlights}
            onNavigate={navigate}
            onQueryChange={setHomeQuery}
            query={homeQuery}
            session={state.session}
          />
        ) : null}
      </main>
    </div>
  );
}
