import { startTransition, useState } from "react";
import type { FormEvent } from "react";
import { FolderGit2, Import, Sparkles } from "lucide-react";

import type { SessionResponse } from "../lib/types.js";

type ImportNewPageProps = {
  onCreateImport: (payload: { repositoryUrl: string; ref?: string }) => Promise<void>;
  onNavigate: (path: string) => void;
  session: SessionResponse["session"];
};

export function ImportNewPage({ onCreateImport, onNavigate, session }: ImportNewPageProps) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [ref, setRef] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      await onCreateImport({
        repositoryUrl: repositoryUrl.trim(),
        ref: ref.trim() || undefined
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown import error");
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="app-panel p-6 sm:p-8">
        <div className="page-stack">
          <div className="space-y-3">
            <p className="eyebrow">GitHub Import</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Bring a repository into AgentLib as a draft.
            </h1>
            <p className="lede">
              Validate `agent.yaml`, snapshot the canonical files, then publish the resulting
              package without leaving the registry.
            </p>
          </div>

          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Repository URL
              </span>
              <input
                className="app-input"
                name="repositoryUrl"
                onChange={(event) => setRepositoryUrl(event.target.value)}
                placeholder="https://github.com/org/repo"
                required
                type="url"
                value={repositoryUrl}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Ref</span>
              <input
                className="app-input"
                name="ref"
                onChange={(event) => setRef(event.target.value)}
                placeholder="main"
                type="text"
                value={ref}
              />
            </label>

            {status === "error" ? <div className="inline-error">{errorMessage}</div> : null}

            <div className="flex flex-wrap gap-3">
              <button className="app-button-primary" disabled={status === "submitting"} type="submit">
                <Import className="h-4 w-4" />
                {status === "submitting" ? "Importing..." : "Create draft"}
              </button>
              <button
                className="app-button-secondary"
                onClick={() =>
                  startTransition(() => {
                    onNavigate("/");
                  })
                }
                type="button"
              >
                Back to registry
              </button>
            </div>
          </form>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="app-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Requirements</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Public GitHub repository</p>
            <p>Valid root-level `agent.yaml`</p>
            <p>Canonical README snapshot support</p>
          </div>
        </section>

        <section className="app-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500 dark:text-violet-300" />
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Account state</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {session ? `Signed in as ${session.handle}.` : "Sign in first to import and claim the draft."}
          </p>
        </section>
      </aside>
    </section>
  );
}
