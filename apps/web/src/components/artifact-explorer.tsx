import { Folder, FileText, FileCode2, ArrowUpLeft } from "lucide-react";

import { buildArtifactExplorerState } from "../lib/artifact-explorer.js";
import type { ArtifactItem } from "../lib/types.js";

type ArtifactExplorerProps = {
  artifacts: ArtifactItem[];
  pathSegments: string[];
  rootLabel: string;
  onNavigateToDirectory: (pathSegments: string[]) => void;
  onOpenArtifact: (path: string) => void;
};

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} kB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(mediaType: string) {
  if (mediaType.includes("json") || mediaType.includes("javascript") || mediaType.includes("yaml")) {
    return <FileCode2 className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />;
  }

  return <FileText className="h-4 w-4 text-slate-500 dark:text-gray-400" />;
}

export function ArtifactExplorer({
  artifacts,
  pathSegments,
  rootLabel,
  onNavigateToDirectory,
  onOpenArtifact
}: ArtifactExplorerProps) {
  const state = buildArtifactExplorerState(artifacts, pathSegments);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-slate-950 dark:text-gray-100">
          /{[rootLabel, ...state.breadcrumbs].join("/")}
          {state.breadcrumbs.length > 0 ? "/" : ""}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
          <button
            className="transition hover:text-slate-900 dark:hover:text-gray-100"
            onClick={() => onNavigateToDirectory([])}
            type="button"
          >
            {rootLabel}
          </button>
          {state.breadcrumbs.map((segment, index) => {
            const nextSegments = state.breadcrumbs.slice(0, index + 1);
            return (
              <div key={nextSegments.join("/")} className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                <button
                  className="transition hover:text-slate-900 dark:hover:text-gray-100"
                  onClick={() => onNavigateToDirectory(nextSegments)}
                  type="button"
                >
                  {segment}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-black/20 dark:text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {state.entries.map((entry) => (
              <tr
                key={`${entry.kind}:${entry.path}`}
                className="border-t border-slate-200 text-slate-700 dark:border-gray-800 dark:text-gray-200"
              >
                <td className="px-4 py-3">
                  {entry.kind === "parent" ? (
                    <button
                      className="inline-flex items-center gap-2 font-medium transition hover:text-slate-950 dark:hover:text-white"
                      onClick={() =>
                        onNavigateToDirectory(entry.path ? entry.path.split("/") : [])
                      }
                      type="button"
                    >
                      <ArrowUpLeft className="h-4 w-4 text-slate-500 dark:text-gray-400" />
                      {entry.name}
                    </button>
                  ) : entry.kind === "directory" ? (
                    <button
                      className="inline-flex items-center gap-2 font-medium transition hover:text-slate-950 dark:hover:text-white"
                      onClick={() => onNavigateToDirectory(entry.path.split("/"))}
                      type="button"
                    >
                      <Folder className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      {entry.name}/
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-2 transition hover:text-slate-950 dark:hover:text-white"
                      onClick={() => onOpenArtifact(entry.path)}
                      type="button"
                    >
                      {iconFor(entry.mediaType)}
                      {entry.name}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-gray-400">
                  {entry.kind === "directory" ? "directory" : entry.kind === "parent" ? "" : entry.mediaType}
                </td>
                <td className="px-4 py-3 text-right text-slate-500 dark:text-gray-400">
                  {entry.kind === "file" ? formatBytes(entry.sizeBytes) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
