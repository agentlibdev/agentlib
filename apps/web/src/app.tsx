import { startTransition, useEffect, useEffectEvent, useState } from "react";

import {
  buildAuthStartUrl,
  createGithubImport,
  fetchAccountSummary,
  fetchAgent,
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
  buildVersionPath,
  matchRoute
} from "./lib/router.js";
import type {
  AgentDetailResponse,
  AgentListResponse,
  AgentVersionDetailResponse,
  ArtifactListResponse,
  ImportDraftResponse,
  PublishRequest,
  SessionResponse,
  AccountSummaryResponse
  ,
  RegistryHighlightsResponse
} from "./lib/types.js";
import { AccountPage } from "./routes/account-page.js";
import { HomePage } from "./routes/home-page.js";
import { AgentPage } from "./routes/agent-page.js";
import { CreatorPage } from "./routes/creator-page.js";
import { ImportDetailPage } from "./routes/import-detail-page.js";
import { ImportNewPage } from "./routes/import-new-page.js";
import { ManualPublishPage } from "./routes/manual-publish-page.js";
import { VersionPage } from "./routes/version-page.js";
import { buildBreadcrumbs, rankCreators } from "./lib/view-models.js";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; view: React.ReactNode };

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

  async function handleLogout() {
    await logoutSession();
    setSession(null);
    navigate("/");
    setRefreshKey((value) => value + 1);
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
              status: "ready",
              view: (
                <HomePage
                  agents={agents.items}
                  highlights={highlights}
                  onNavigate={navigate}
                  session={currentSession}
                />
              )
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
                  session={currentSession}
                />
              )
            });
          }
          return;
        }

        setState({
          status: "ready",
          view: (
            <section className="panel empty-state stack-sm">
              <p className="eyebrow">Not Found</p>
              <h1>This route does not map to an agent page.</h1>
              <p>Go back to the registry and pick an existing agent or version.</p>
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
    <main className="shell stack-lg">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("/")} type="button">
          AgentLib
        </button>
        <div className="topbar-actions">
          <span className="topbar-note">
            {session ? `Signed in as ${session.handle}` : "Registry preview and manual publish"}
          </span>
          {session ? (
            <>
              <button className="secondary-action" onClick={() => navigate(buildAccountPath())} type="button">
                Account
              </button>
              <button className="secondary-action" onClick={() => void handleLogout()} type="button">
                Log out
              </button>
            </>
          ) : (
            <>
              <a className="secondary-action" href={buildAuthStartUrl("github", pathname)}>
                Sign in with GitHub
              </a>
              <a className="secondary-action" href={buildAuthStartUrl("google", pathname)}>
                Sign in with Google
              </a>
            </>
          )}
        </div>
      </header>

      {state.status === "loading" ? (
        <section className="panel empty-state">
          <p className="eyebrow">Loading</p>
          <h1>Fetching registry state.</h1>
          <p>Loading current catalog data from the AgentLib API.</p>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="panel error-state stack-sm">
          <p className="eyebrow">Error</p>
          <h1>Could not load this page.</h1>
          <p>{state.message}</p>
          <button
            className="brand"
            onClick={() => navigate(buildAgentPath("raul", "code-reviewer"))}
            type="button"
          >
            Open sample agent
          </button>
        </section>
      ) : null}

      {state.status === "ready" ? state.view : null}
    </main>
  );
}
