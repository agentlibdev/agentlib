import type { ReactNode } from "react";
import { Copy, ExternalLink, Globe, Package, User } from "lucide-react";

import { buildCreatorPath } from "../lib/router.js";
import type { AgentProvenance } from "../lib/types.js";

type PackageSidebarProps = {
  namespace: string;
  name: string;
  version: string;
  ownerHandle: string;
  license: string | null;
  publishedAt: string;
  provenance: AgentProvenance;
  onNavigate: (path: string) => void;
  extraContent?: ReactNode;
};

function formatInstallCommand(namespace: string, name: string, version: string): string {
  return `agentlib install ${namespace}/${name}@${version}`;
}

function normalizeValue(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

export function PackageSidebar({
  namespace,
  name,
  version,
  ownerHandle,
  license,
  publishedAt,
  provenance,
  onNavigate,
  extraContent
}: PackageSidebarProps) {
  const installCommand = formatInstallCommand(namespace, name, version);
  const originalAuthorHandle = provenance.originalAuthorHandle?.trim() || null;
  const originalAuthorName = provenance.originalAuthorName?.trim() || null;
  const showOriginalAuthor =
    normalizeValue(originalAuthorHandle) !== normalizeValue(ownerHandle) &&
    normalizeValue(originalAuthorName) !== normalizeValue(ownerHandle);

  async function handleCopyInstall() {
    await navigator.clipboard.writeText(installCommand);
  }

  return (
    <section className="app-panel-muted p-5">
      <div className="space-y-5">
        <div>
          <p className="eyebrow">Install</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-gray-800 dark:bg-black/20">
            <Package className="h-4 w-4 flex-none text-cyan-500 dark:text-cyan-400" />
            <code className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-gray-100">
              {installCommand}
            </code>
            <button
              aria-label="Copy install command"
              className="app-button-secondary px-3 py-2"
              onClick={() => void handleCopyInstall()}
              type="button"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-200 pt-5 dark:border-gray-800">
          <div>
            <p className="eyebrow">Owner</p>
            <button
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition hover:text-cyan-600 dark:text-gray-100 dark:hover:text-cyan-300"
              onClick={() => onNavigate(buildCreatorPath(ownerHandle))}
              type="button"
            >
              <User className="h-4 w-4" />
              {ownerHandle}
            </button>
          </div>

          {showOriginalAuthor ? (
            <div>
              <p className="eyebrow">Original author</p>
              {provenance.originalAuthorUrl ? (
                <a
                  className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition hover:text-cyan-600 dark:text-gray-100 dark:hover:text-cyan-300"
                  href={provenance.originalAuthorUrl}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                >
                  <User className="h-4 w-4" />
                  {originalAuthorName ?? originalAuthorHandle ?? "Unknown"}
                </a>
              ) : (
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-gray-100">
                  <User className="h-4 w-4" />
                  {originalAuthorName ?? originalAuthorHandle ?? "Unknown"}
                </p>
              )}
            </div>
          ) : null}

          {provenance.sourceRepositoryUrl ? (
            <div>
              <p className="eyebrow">Repository</p>
              <a
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition hover:text-cyan-600 dark:text-gray-100 dark:hover:text-cyan-300"
                href={provenance.sourceRepositoryUrl}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
                {provenance.sourceRepositoryUrl}
              </a>
            </div>
          ) : null}

          {provenance.originalAuthorUrl ? (
            <div>
              <p className="eyebrow">Homepage</p>
              <a
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition hover:text-cyan-600 dark:text-gray-100 dark:hover:text-cyan-300"
                href={provenance.originalAuthorUrl}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                <Globe className="h-4 w-4" />
                {provenance.originalAuthorUrl}
              </a>
            </div>
          ) : null}

          <div>
            <p className="eyebrow">Version</p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-gray-100">{version}</p>
          </div>

          <div>
            <p className="eyebrow">License</p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-gray-100">
              {license ?? "No license set"}
            </p>
          </div>

          <div>
            <p className="eyebrow">Last publish</p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-gray-100">
              {new Date(publishedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {extraContent ? (
          <div className="border-t border-slate-200 pt-5 dark:border-gray-800">{extraContent}</div>
        ) : null}
      </div>
    </section>
  );
}
