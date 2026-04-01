import type React from "react";
import { Download, FileCode2, FileJson, Files, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Breadcrumbs } from "../components/breadcrumbs.js";
import {
  buildTrackedArtifactDownloadUrl,
  buildTrackedVersionBundleDownloadUrl
} from "../lib/api.js";
import type {
  AgentVersionDetailResponse,
  ArtifactPreviewResponse
} from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";

type ArtifactPageProps = {
  breadcrumbs: Breadcrumb[];
  detail: AgentVersionDetailResponse;
  preview: ArtifactPreviewResponse;
  onNavigate: (path: string) => void;
  onRecordDownload: (namespace: string, name: string) => Promise<void>;
};

type JsonTokenKind = "string" | "number" | "boolean" | "null" | "punctuation";

type JsonToken = {
  kind: JsonTokenKind;
  value: string;
};

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  const matcher =
    /"(?:\\.|[^"\\])*"(?=\s*:)?|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b|[{}\[\],:]/g;

  for (const match of text.matchAll(matcher)) {
    const value = match[0];
    let kind: JsonTokenKind = "punctuation";

    if (value.startsWith("\"")) {
      kind = "string";
    } else if (value === "true" || value === "false") {
      kind = "boolean";
    } else if (value === "null") {
      kind = "null";
    } else if (/^-?\d/.test(value)) {
      kind = "number";
    }

    tokens.push({ kind, value });
  }

  return tokens;
}

function renderJsonHighlighted(text: string): React.ReactNode {
  const formatted = formatJson(text);
  const lines = formatted.split("\n");

  return lines.map((line, lineIndex) => {
    const segments: React.ReactNode[] = [];
    let cursor = 0;

    for (const token of tokenizeJson(line)) {
      const tokenIndex = line.indexOf(token.value, cursor);
      if (tokenIndex > cursor) {
        segments.push(
          <span key={`plain-${lineIndex}-${cursor}`}>{line.slice(cursor, tokenIndex)}</span>
        );
      }

      segments.push(
        <span className={`json-token json-token-${token.kind}`} key={`token-${lineIndex}-${tokenIndex}`}>
          {token.value}
        </span>
      );
      cursor = tokenIndex + token.value.length;
    }

    if (cursor < line.length) {
      segments.push(<span key={`tail-${lineIndex}-${cursor}`}>{line.slice(cursor)}</span>);
    }

    return (
      <div key={`line-${lineIndex}`}>
        {segments}
      </div>
    );
  });
}

function ArtifactKindIcon({ kind }: { kind: ArtifactPreviewResponse["preview"]["kind"] }) {
  if (kind === "markdown") {
    return <FileText className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />;
  }

  if (kind === "json") {
    return <FileJson className="h-5 w-5 text-violet-500 dark:text-violet-400" />;
  }

  return <FileCode2 className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />;
}

export function ArtifactPage({
  breadcrumbs,
  detail,
  preview,
  onNavigate,
  onRecordDownload
}: ArtifactPageProps) {
  const downloadUrl = buildTrackedArtifactDownloadUrl(
    detail.version.namespace,
    detail.version.name,
    detail.version.version,
    preview.artifact.path
  );
  const bundleUrl = buildTrackedVersionBundleDownloadUrl(
    detail.version.namespace,
    detail.version.name,
    detail.version.version
  );

  async function handleFileDownload() {
    await onRecordDownload(detail.version.namespace, detail.version.name);
    window.location.href = downloadUrl;
  }

  async function handleBundleDownload() {
    await onRecordDownload(detail.version.namespace, detail.version.name);
    window.location.href = bundleUrl;
  }

  return (
    <section className="page-stack">
      <section className="app-panel p-6 sm:p-8">
        <div className="page-stack">
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">Artifact Viewer</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-gray-100">
                {preview.artifact.path}
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {preview.artifact.mediaType} · {preview.artifact.sizeBytes} bytes
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="app-button-secondary" onClick={() => void handleFileDownload()} type="button">
                <Download className="h-4 w-4" />
                Download file
              </button>
              <button className="app-button-primary" onClick={() => void handleBundleDownload()} type="button">
                <Files className="h-4 w-4" />
                Download ZIP
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="app-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 dark:border-gray-800">
            <ArtifactKindIcon kind={preview.preview.kind} />
            <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">Preview</h2>
          </div>

          <div className="p-6">
            {preview.preview.kind === "markdown" ? (
              <div className="artifact-markdown">
                <ReactMarkdown>{preview.preview.text}</ReactMarkdown>
              </div>
            ) : null}

            {preview.preview.kind === "json" ? (
              <pre className="artifact-code-block artifact-json-block">
                {renderJsonHighlighted(preview.preview.text)}
              </pre>
            ) : null}

            {preview.preview.kind === "text" ? (
              <pre className="artifact-code-block">{preview.preview.text}</pre>
            ) : null}
          </div>
        </section>

        <aside className="app-panel-muted p-5">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-gray-100">Version</h2>
            <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
              <p>{detail.version.namespace}/{detail.version.name}</p>
              <p>Version {detail.version.version}</p>
              <p>Status {detail.version.lifecycleStatus}</p>
              <p>Owner {detail.version.ownerHandle}</p>
            </div>
          </div>
        </aside>
      </section>
    </section>
  );
}
