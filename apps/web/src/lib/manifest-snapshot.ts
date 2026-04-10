export type ManifestSnapshotViewModel = {
  apiVersion: string | null;
  kind: string | null;
  namespace: string | null;
  name: string | null;
  version: string | null;
  title: string | null;
  description: string | null;
  summary: string | null;
  formattedJson: string;
};

export function buildManifestSnapshotViewModel(manifestJson: string): ManifestSnapshotViewModel {
  try {
    const parsed = JSON.parse(manifestJson) as {
      apiVersion?: unknown;
      kind?: unknown;
      metadata?: Record<string, unknown>;
      spec?: Record<string, unknown>;
    };

    const metadata = parsed.metadata ?? {};
    const spec = parsed.spec ?? {};

    return {
      apiVersion: typeof parsed.apiVersion === "string" ? parsed.apiVersion : null,
      kind: typeof parsed.kind === "string" ? parsed.kind : null,
      namespace: typeof metadata.namespace === "string" ? metadata.namespace : null,
      name: typeof metadata.name === "string" ? metadata.name : null,
      version: typeof metadata.version === "string" ? metadata.version : null,
      title: typeof metadata.title === "string" ? metadata.title : null,
      description: typeof metadata.description === "string" ? metadata.description : null,
      summary: typeof spec.summary === "string" ? spec.summary : null,
      formattedJson: JSON.stringify(parsed, null, 2)
    };
  } catch {
    return {
      apiVersion: null,
      kind: null,
      namespace: null,
      name: null,
      version: null,
      title: null,
      description: null,
      summary: null,
      formattedJson: manifestJson
    };
  }
}
