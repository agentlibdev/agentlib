import assert from "node:assert/strict";
import { spawn } from "node:child_process";

import { waitForHealth } from "./_local-api.mjs";
import { createSamplePublishRequest } from "./sample-publish-request.mjs";

const version = process.argv[2] ?? "0.3.2";
const namespace = "raul";
const name = "code-reviewer";
const sampleRequest = createSamplePublishRequest(version);
const expectedArtifacts = sampleRequest.artifacts
  .map((artifact) => ({
    path: artifact.path,
    mediaType: artifact.mediaType,
    sizeBytes: Buffer.from(artifact.content, "base64").byteLength
  }))
  .sort((left, right) => left.path.localeCompare(right.path));

function createCommandError(command, args, exitCode, stderr) {
  const details = stderr.trim();
  const suffix = details ? `\n${details}` : "";
  return new Error(`${command} ${args.join(" ")} exited with code ${exitCode}.${suffix}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(createCommandError(command, args, code, stderr));
    });
  });
}

async function stopServer(child) {
  if (child.exitCode !== null) {
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
      resolve();
    }, 2000);

    child.on("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

let devServer = null;
const devLogs = [];

try {
  await runCommand("npm", ["run", "db:reset:local"], { cwd: process.cwd() });

  devServer = spawn("npm", ["run", "dev:api:local"], {
    cwd: process.cwd(),
    detached: true,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  devServer.stdout.on("data", (chunk) => {
    devLogs.push(chunk.toString());
  });

  devServer.stderr.on("data", (chunk) => {
    devLogs.push(chunk.toString());
  });

  await waitForHealth();

  const publish = await runCommand(
    "node",
    ["scripts/publish-sample-local.mjs", version],
    { cwd: process.cwd() }
  );
  const publishBody = JSON.parse(publish.stdout);

  assert.deepEqual(publishBody, {
    agent: {
      namespace,
      name,
      version
    }
  });

  const listed = await runCommand(
    "node",
    ["scripts/list-artifacts-local.mjs", namespace, name, version],
    { cwd: process.cwd() }
  );
  const listBody = JSON.parse(listed.stdout);
  listBody.items.sort((left, right) => left.path.localeCompare(right.path));

  assert.deepEqual(listBody, {
    items: expectedArtifacts
  });

  const download = await runCommand(
    "node",
    ["scripts/download-artifact-local.mjs", namespace, name, version, "README.md"],
    { cwd: process.cwd() }
  );

  assert.equal(download.stdout.trim(), "# Code Reviewer");

  console.log(
    JSON.stringify(
      {
        ok: true,
        version,
        artifacts: listBody.items.map((artifact) => artifact.path)
      },
      null,
      2
    )
  );
} catch (error) {
  if (devLogs.length > 0) {
    console.error(devLogs.join(""));
  }

  throw error;
} finally {
  if (devServer) {
    await stopServer(devServer);
  }
}
