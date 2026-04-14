import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { buildLocalRepositoryPublishPayload } from "../packages/core/src/local-repository-publish.js";
import { waitForHealth } from "./_local-api.js";
import {
  buildSuperpowersDemoHeaders,
  resolveSuperpowersVersion,
  superpowersCompatibility
} from "./_superpowers-demo.js";

const baseUrl = "http://127.0.0.1:8787";
const repositoryUrl = process.argv[2] || "https://github.com/obra/superpowers";
const ref = process.argv[3] || "main";
const version = resolveSuperpowersVersion(process.argv[4]);

function run(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

const tempRoot = await mkdtemp(join(tmpdir(), "agentlib-superpowers-"));
const repoDir = join(tempRoot, "repo");

try {
  await waitForHealth(baseUrl);

  await run("git", ["clone", "--depth", "1", "--branch", ref, repositoryUrl, repoDir]);

  const payload = await buildLocalRepositoryPublishPayload(repoDir, {
    namespace: "obra",
    name: "superpowers",
    version,
    title: "Superpowers",
    description: "Open skills system and reusable instruction repository.",
    packageKind: "repository-snapshot",
    compatibility: superpowersCompatibility
  });

  const response = await fetch(`${baseUrl}/api/v1/publish`, {
    method: "POST",
    headers: buildSuperpowersDemoHeaders(),
    body: JSON.stringify(payload)
  });

  const body = await response.text();
  let parsedBody: unknown;

  try {
    parsedBody = body ? JSON.parse(body) : null;
  } catch {
    parsedBody = body;
  }

  if (!response.ok) {
    if (
      parsedBody &&
      typeof parsedBody === "object" &&
      parsedBody !== null &&
      "error" in parsedBody &&
      parsedBody.error &&
      typeof parsedBody.error === "object" &&
      parsedBody.error !== null &&
      "code" in parsedBody.error &&
      parsedBody.error.code === "version_exists"
    ) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            skipped: true,
            reason: "version_exists",
            package: "obra/superpowers",
            version,
            repositoryUrl,
            ref
          },
          null,
          2
        )
      );
      process.exit(0);
    }

    console.error(body);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        package: "obra/superpowers",
        version,
        repositoryUrl,
        ref,
        artifactCount: payload.artifacts.length,
        response: parsedBody
      },
      null,
      2
    )
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
