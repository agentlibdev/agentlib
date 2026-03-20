import { startTransition, useEffect, useState } from "react";

import {
  fetchAgent,
  fetchAgents,
  fetchArtifacts,
  fetchAgentVersion
} from "./lib/api.js";
import { buildAgentPath, matchRoute } from "./lib/router.js";
import type {
  AgentDetailResponse,
  AgentListResponse,
  AgentVersionDetailResponse,
  ArtifactListResponse
} from "./lib/types.js";
import { HomePage } from "./routes/home-page.js";
import { AgentPage } from "./routes/agent-page.js";
import { VersionPage } from "./routes/version-page.js";

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

  return {
    pathname,
    navigate(nextPath: string) {
      startTransition(() => {
        window.history.pushState({}, "", nextPath);
        setPathname(nextPath);
      });
    }
  };
}

export function App() {
  const { pathname, navigate } = usePathname();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      const route = matchRoute(pathname);

      try {
        if (route.name === "home") {
          const agents: AgentListResponse = await fetchAgents();
          if (!cancelled) {
            setState({
              status: "ready",
              view: <HomePage agents={agents.items} onNavigate={navigate} />
            });
          }
          return;
        }

        if (route.name === "agent") {
          const detail: AgentDetailResponse = await fetchAgent(route.namespace, route.nameParam);
          if (!cancelled) {
            setState({
              status: "ready",
              view: <AgentPage detail={detail} onNavigate={navigate} />
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
              view: <VersionPage detail={detail} artifacts={artifacts.items} />
            });
          }
          return;
        }

        setState({
          status: "ready",
          view: (
            <section className="panel empty-state stack-sm">
              <p className="eyebrow">Not Found</p>
              <h1>There is nothing here yet.</h1>
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
  }, [pathname, navigate]);

  return (
    <main className="shell stack-lg">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("/")} type="button">
          AgentLib
        </button>
        <span className="topbar-note">Read-only registry preview</span>
      </header>

      {state.status === "loading" ? (
        <section className="panel empty-state">
          <p className="eyebrow">Loading</p>
          <h1>Fetching registry state.</h1>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="panel error-state stack-sm">
          <p className="eyebrow">Error</p>
          <h1>Could not load this page.</h1>
          <p>{state.message}</p>
          <button className="brand" onClick={() => navigate(buildAgentPath("raul", "code-reviewer"))} type="button">
            Open sample agent
          </button>
        </section>
      ) : null}

      {state.status === "ready" ? state.view : null}
    </main>
  );
}
