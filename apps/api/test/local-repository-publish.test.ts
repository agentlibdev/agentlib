import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildLocalRepositoryPublishPayload } from "../../../packages/core/src/local-repository-publish.js";

test("buildLocalRepositoryPublishPayload builds a monolithic repository snapshot payload", async () => {
  const root = await mkdtemp(join(tmpdir(), "agentlib-repo-"));
  const repoDir = join(root, "superpowers");
  await mkdir(join(repoDir, "skills", "debugging"), { recursive: true });
  await mkdir(join(repoDir, "docs"), { recursive: true });
  await mkdir(join(repoDir, ".git"), { recursive: true });
  await mkdir(join(repoDir, "node_modules", "leftpad"), { recursive: true });

  await writeFile(join(repoDir, "README.md"), "# Superpowers\n\nSkill system.\n", "utf8");
  await writeFile(join(repoDir, "LICENSE"), "MIT\n", "utf8");
  await writeFile(join(repoDir, "docs", "overview.md"), "Overview\n", "utf8");
  await writeFile(join(repoDir, "skills", "debugging", "SKILL.md"), "# Debugging\n", "utf8");
  await writeFile(join(repoDir, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");
  await writeFile(join(repoDir, "node_modules", "leftpad", "index.js"), "module.exports = {};\n", "utf8");

  const payload = await buildLocalRepositoryPublishPayload(repoDir, {
    namespace: "obra",
    name: "superpowers",
    version: "2026.04.13-demo",
    title: "Superpowers",
    description: "Open skill system and instructions repository.",
    packageKind: "repository-snapshot",
    compatibility: {
      targets: [
        {
          targetId: "codex",
          builtFor: true,
          tested: true,
          adapterAvailable: true
        },
        {
          targetId: "openclaw",
          builtFor: false,
          tested: false,
          adapterAvailable: true
        }
      ]
    }
  });

  assert.equal(payload.packageKind, "repository-snapshot");
  assert.equal(payload.manifest.metadata.namespace, "obra");
  assert.equal(payload.manifest.metadata.name, "superpowers");
  assert.equal(payload.manifest.metadata.version, "2026.04.13-demo");
  assert.equal(payload.manifest.metadata.title, "Superpowers");
  assert.equal(payload.readme, "# Superpowers\n\nSkill system.\n");
  assert.deepEqual(payload.compatibility, {
    targets: [
      {
        targetId: "codex",
        builtFor: true,
        tested: true,
        adapterAvailable: true
      },
      {
        targetId: "openclaw",
        builtFor: false,
        tested: false,
        adapterAvailable: true
      }
    ]
  });
  assert.deepEqual(
    payload.artifacts.map((artifact) => artifact.path),
    ["docs/overview.md", "LICENSE", "README.md", "skills/debugging/SKILL.md"]
  );
});

test("buildLocalRepositoryPublishPayload synthesizes a README when missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "agentlib-repo-"));
  const repoDir = join(root, "agentskills");
  await mkdir(join(repoDir, "spec"), { recursive: true });
  await writeFile(join(repoDir, "spec", "README.txt"), "Spec\n", "utf8");

  const payload = await buildLocalRepositoryPublishPayload(repoDir, {
    namespace: "agentskills",
    name: "agentskills",
    version: "2026.04.13-demo",
    title: "Agent Skills",
    description: "Open standard for portable agent skills.",
    packageKind: "repository-snapshot"
  });

  assert.equal(payload.readme, "# Agent Skills\n\nOpen standard for portable agent skills.\n");
  assert.deepEqual(payload.artifacts.map((artifact) => artifact.path), ["spec/README.txt"]);
});
