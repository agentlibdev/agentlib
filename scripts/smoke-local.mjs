import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { waitForHealth } from "./_local-api.mjs";
import {
  createCliSmokeEnv,
  resolveAgentCliDir,
  resolveSmokeRef
} from "./smoke-local-lib.mjs";

const projectRoot = process.cwd();
const baseUrl = process.env.AGENTLIB_BASE_URL || "http://127.0.0.1:8787";
const cliDir = resolveAgentCliDir(projectRoot, process.env);
const smokeRef = resolveSmokeRef(process.env);
const cliSmokeScript = path.join(cliDir, "scripts", "smoke-local.sh");

function discoverGoBinDir() {
  const candidates = [
    process.env.AGENTLIB_GO_BIN_DIR,
    process.env.HOME ? path.join(process.env.HOME, ".local", "go", "bin") : "",
    ...(
      fs.existsSync("/home")
        ? fs.readdirSync("/home").map((entry) => path.join("/home", entry, ".local", "go", "bin"))
        : []
    )
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "go"))) || "";
}

const discoveredGoBinDir = discoverGoBinDir();
const cliSmokeEnv = {
  ...createCliSmokeEnv({
    ...process.env,
    ...(discoveredGoBinDir ? { AGENTLIB_GO_BIN_DIR: discoveredGoBinDir } : {})
  }),
  AGENTLIB_BASE_URL: baseUrl,
  AGENTLIB_SMOKE_REF: smokeRef
};

function createCommandError(command, args, exitCode, stderr) {
  const details = stderr.trim();
  const suffix = details ? `\n${details}` : "";
  return new Error(`${command} ${args.join(" ")} exited with code ${exitCode}.${suffix}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
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

function ensureCliPrerequisites() {
  if (!fs.existsSync(cliDir)) {
    throw new Error(`agent-cli repo not found at ${cliDir}. Set AGENTLIB_CLI_DIR if needed.`);
  }

  if (!fs.existsSync(cliSmokeScript)) {
    throw new Error(`CLI smoke script not found at ${cliSmokeScript}.`);
  }
}

let devServer = null;
const devLogs = [];

try {
  ensureCliPrerequisites();

  await runCommand("npm", ["run", "db:reset:local"], { cwd: projectRoot });

  devServer = spawn("npm", ["run", "dev:api:local"], {
    cwd: projectRoot,
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

  await waitForHealth(baseUrl);

  const populate = await runCommand("node", ["scripts/populate-demo-local.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      AGENTLIB_BASE_URL: baseUrl
    }
  });
  const populateBody = JSON.parse(populate.stdout);
  assert.equal(populateBody.ok, true);

  const cliSmoke = await runCommand("bash", ["./scripts/smoke-local.sh"], {
    cwd: cliDir,
    env: cliSmokeEnv
  });

  if (!cliSmoke.stdout.includes("smoke ok")) {
    throw new Error(`CLI smoke did not finish successfully.\n${cliSmoke.stdout}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        smokeRef,
        cliDir,
        populatedAgents: populateBody.agents.length
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
