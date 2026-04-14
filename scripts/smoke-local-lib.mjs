import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export function resolveAgentCliDir(projectRoot, env = process.env) {
  return env.AGENTLIB_CLI_DIR || path.resolve(projectRoot, "../agent-cli");
}

export function resolveSmokeRef(env = process.env) {
  return env.AGENTLIB_SMOKE_REF || "raul/code-reviewer@0.3.0";
}

export function createCliSmokeEnv(env = process.env) {
  const explicitGoBinDir = env.AGENTLIB_GO_BIN_DIR;
  const homeDir = env.HOME || os.homedir();
  const userHomeDir = env.USER ? path.join("/home", env.USER) : "";
  const goBinCandidates = [
    explicitGoBinDir,
    path.join(homeDir, ".local", "go", "bin"),
    userHomeDir ? path.join(userHomeDir, ".local", "go", "bin") : ""
  ].filter(Boolean);
  const goBinDir =
    goBinCandidates.find((candidate) => fs.existsSync(path.join(candidate, "go"))) ||
    goBinCandidates[0];
  const existingPath = env.PATH || "";

  return {
    ...env,
    PATH: existingPath ? `${goBinDir}${path.delimiter}${existingPath}` : goBinDir,
    GOCACHE: env.GOCACHE || "/tmp/agent-cli-go-build",
    GOMODCACHE: env.GOMODCACHE || "/tmp/agent-cli-go-mod"
  };
}
