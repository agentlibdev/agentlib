import { startTransition, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { buildManualPublishRequest } from "../lib/manual-publish.js";
import type { PublishRequest, SessionResponse } from "../lib/types.js";

type ManualPublishPageProps = {
  onNavigate: (path: string) => void;
  onPublish: (payload: PublishRequest) => Promise<void>;
  session: SessionResponse["session"];
};

type FormState = {
  namespace: string;
  name: string;
  version: string;
  title: string;
  description: string;
  license: string;
  summary: string;
  readme: string;
};

const initialState: FormState = {
  namespace: "",
  name: "",
  version: "",
  title: "",
  description: "",
  license: "MIT",
  summary: "",
  readme: "# Agent Title\n"
};

export function ManualPublishPage({ onNavigate, onPublish, session }: ManualPublishPageProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const payload = await buildManualPublishRequest(form, files);
      await onPublish(payload);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown publish error");
    }
  }

  return (
    <section className="manual-shell stack-lg">
      <div className="manual-hero panel stack-sm">
        <p className="eyebrow">Manual Registry</p>
        <h1>Create a registry entry by hand.</h1>
        <p className="lede">
          Fill the manifest fields, paste the README, and upload the package files you want
          published as artifacts.
        </p>
        {session ? (
          <p className="toolbar-meta">Publishing as {session.handle}</p>
        ) : (
          <p className="toolbar-meta">Sign in first to publish and claim ownership.</p>
        )}
      </div>

      <form className="manual-layout" onSubmit={(event) => void handleSubmit(event)}>
        <section className="panel stack-lg">
          <div className="section-head">
            <h2>Package metadata</h2>
            <span>Schema-backed</span>
          </div>

          <div className="manual-grid">
            <label className="search-field">
              <span>Namespace</span>
              <input
                name="namespace"
                onChange={(event) => updateField("namespace", event.target.value)}
                required
                value={form.namespace}
              />
            </label>
            <label className="search-field">
              <span>Name</span>
              <input
                name="name"
                onChange={(event) => updateField("name", event.target.value)}
                required
                value={form.name}
              />
            </label>
            <label className="search-field">
              <span>Version</span>
              <input
                name="version"
                onChange={(event) => updateField("version", event.target.value)}
                placeholder="0.1.0"
                required
                value={form.version}
              />
            </label>
            <label className="search-field">
              <span>License</span>
              <input
                name="license"
                onChange={(event) => updateField("license", event.target.value)}
                value={form.license}
              />
            </label>
          </div>

          <label className="search-field search-field-wide">
            <span>Title</span>
            <input
              name="title"
              onChange={(event) => updateField("title", event.target.value)}
              required
              value={form.title}
            />
          </label>

          <label className="search-field search-field-wide">
            <span>Description</span>
            <textarea
              name="description"
              onChange={(event) => updateField("description", event.target.value)}
              required
              rows={3}
              value={form.description}
            />
          </label>

          <label className="search-field search-field-wide">
            <span>Summary</span>
            <textarea
              name="summary"
              onChange={(event) => updateField("summary", event.target.value)}
              required
              rows={4}
              value={form.summary}
            />
          </label>

          <label className="search-field search-field-wide">
            <span>README</span>
            <textarea
              className="manual-readme"
              name="readme"
              onChange={(event) => updateField("readme", event.target.value)}
              required
              rows={12}
              value={form.readme}
            />
          </label>
        </section>

        <aside className="stack-lg">
          <section className="panel stack-sm">
            <div className="section-head">
              <h2>Artifacts</h2>
              <span>{files.length} files</span>
            </div>
            <label className="search-field search-field-wide">
              <span>Upload files</span>
              <input multiple onChange={handleFilesChange} type="file" />
            </label>
            <div className="artifact-list">
              {files.length === 0 ? (
                <div className="inset-empty stack-sm manual-file-empty">
                  <p className="eyebrow">Missing</p>
                  <p>Add `agent.yaml`, `README.md`, and any extra package files.</p>
                </div>
              ) : (
                files.map((file) => (
                  <div className="artifact-row" key={`${file.name}:${file.size}`}>
                    <span>{file.name}</span>
                    <span>
                      {file.type || "application/octet-stream"} · {file.size} bytes
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel stack-sm">
            <p className="eyebrow">Publish</p>
            <h2>Push this package to the registry.</h2>
            <p>
              This first slice publishes immediately. Ownership, edit history, and lifecycle
              controls land in the next backend phase.
            </p>
            <div className="action-row">
              <button
                className="primary-action"
                disabled={status === "submitting" || !session}
                type="submit"
              >
                {status === "submitting" ? "Publishing..." : "Publish package"}
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

            {status === "error" ? (
              <div className="inline-error">
                <strong>Publish failed.</strong>
                <span>{errorMessage}</span>
              </div>
            ) : null}
          </section>
        </aside>
      </form>
    </section>
  );
}
