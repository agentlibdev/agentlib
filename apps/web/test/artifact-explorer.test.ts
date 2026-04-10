import assert from "node:assert/strict";
import test from "node:test";

import { buildArtifactExplorerState } from "../src/lib/artifact-explorer.js";
import type { ArtifactItem } from "../src/lib/types.js";

const artifacts: ArtifactItem[] = [
  { path: "README.md", mediaType: "text/markdown", sizeBytes: 1200 },
  { path: "dist/index.js", mediaType: "text/javascript", sizeBytes: 4200 },
  { path: "dist/assets/sounds/choc.wav", mediaType: "audio/wav", sizeBytes: 20800 },
  { path: "dist/assets/sounds/funny.wav", mediaType: "audio/wav", sizeBytes: 28300 },
  { path: "dist/assets/logo.svg", mediaType: "image/svg+xml", sizeBytes: 3200 }
];

test("buildArtifactExplorerState groups artifacts into folders and files for root", () => {
  const state = buildArtifactExplorerState(artifacts, []);

  assert.deepEqual(state.breadcrumbs, []);
  assert.deepEqual(
    state.entries.map((entry) => ({
      kind: entry.kind,
      name: entry.name
    })),
    [
      { kind: "directory", name: "dist" },
      { kind: "file", name: "README.md" }
    ]
  );
});

test("buildArtifactExplorerState resolves nested directories with parent support", () => {
  const state = buildArtifactExplorerState(artifacts, ["dist", "assets", "sounds"]);

  assert.deepEqual(state.breadcrumbs, ["dist", "assets", "sounds"]);
  assert.deepEqual(
    state.entries.map((entry) => ({
      kind: entry.kind,
      name: entry.name,
      path: entry.path
    })),
    [
      { kind: "parent", name: "../", path: "dist/assets" },
      { kind: "file", name: "choc.wav", path: "dist/assets/sounds/choc.wav" },
      { kind: "file", name: "funny.wav", path: "dist/assets/sounds/funny.wav" }
    ]
  );
});
