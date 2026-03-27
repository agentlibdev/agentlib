import { startTransition, useState } from "react";
import type { FormEvent } from "react";
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
    <section className="panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">GitHub Import</p>
        <h1>Bring a repository into AgentLib as a draft.</h1>
        <p className="lede">
          This flow validates `agent.yaml`, snapshots the canonical package files, and leaves the
          resulting draft ready for manual publish.
        </p>
        {session ? null : (
          <p className="toolbar-meta">Sign in first to import and claim the draft.</p>
        )}
      </div>

      <form className="stack-lg" onSubmit={(event) => void handleSubmit(event)}>
        <label className="search-field">
          <span>Repository URL</span>
          <input
            name="repositoryUrl"
            onChange={(event) => setRepositoryUrl(event.target.value)}
            placeholder="https://github.com/org/repo"
            required
            type="url"
            value={repositoryUrl}
          />
        </label>

        <label className="search-field">
          <span>Ref</span>
          <input
            name="ref"
            onChange={(event) => setRef(event.target.value)}
            placeholder="main"
            type="text"
            value={ref}
          />
        </label>

        {status === "error" ? (
          <div className="inline-error">
            <strong>Import failed.</strong>
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="action-row">
          <button className="primary-action" disabled={status === "submitting"} type="submit">
            {status === "submitting" ? "Importing..." : "Create draft"}
          </button>
          <button
            className="secondary-action"
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
    </section>
  );
}
