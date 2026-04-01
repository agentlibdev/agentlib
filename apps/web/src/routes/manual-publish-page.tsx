import { startTransition, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { FileUp, PackagePlus, PencilRuler } from "lucide-react";

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
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form className="space-y-6" id="manual-publish-form" onSubmit={(event) => void handleSubmit(event)}>
        <section className="app-panel p-6 sm:p-8">
          <div className="page-stack">
            <div className="space-y-3">
              <p className="eyebrow">Manual Registry</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Create a registry entry by hand.
              </h1>
              <p className="lede">
                Fill the manifest fields, paste the README, and upload the package files you want
                published as artifacts.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Namespace</span>
                <input className="app-input" onChange={(event) => updateField("namespace", event.target.value)} required value={form.namespace} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
                <input className="app-input" onChange={(event) => updateField("name", event.target.value)} required value={form.name} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Version</span>
                <input className="app-input" onChange={(event) => updateField("version", event.target.value)} placeholder="0.1.0" required value={form.version} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">License</span>
                <input className="app-input" onChange={(event) => updateField("license", event.target.value)} value={form.license} />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</span>
              <input className="app-input" onChange={(event) => updateField("title", event.target.value)} required value={form.title} />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
              <textarea className="app-textarea" onChange={(event) => updateField("description", event.target.value)} required rows={3} value={form.description} />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Summary</span>
              <textarea className="app-textarea" onChange={(event) => updateField("summary", event.target.value)} required rows={4} value={form.summary} />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">README</span>
              <textarea className="app-textarea min-h-[320px]" onChange={(event) => updateField("readme", event.target.value)} required rows={14} value={form.readme} />
            </label>
          </div>
        </section>
      </form>

      <aside className="space-y-6">
        <section className="app-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileUp className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Artifacts</h2>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload files</span>
            <input className="app-input file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan-700 dark:file:text-cyan-200" multiple onChange={handleFilesChange} type="file" />
          </label>
          <div className="mt-4 space-y-3">
            {files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Add `agent.yaml`, `README.md`, and any extra package files.
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

        <section className="app-panel-muted p-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-violet-500 dark:text-violet-300" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Publish</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {session
                ? `Publishing as ${session.handle}.`
                : "Sign in first to publish and claim ownership."}
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="app-button-primary"
                disabled={status === "submitting" || !session}
                form="manual-publish-form"
                type="submit"
              >
                <PencilRuler className="h-4 w-4" />
                {status === "submitting" ? "Publishing..." : "Publish package"}
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
            {status === "error" ? <div className="inline-error">{errorMessage}</div> : null}
          </div>
        </section>
      </aside>
    </section>
  );
}
