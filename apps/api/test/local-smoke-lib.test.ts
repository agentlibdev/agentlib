import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

type SmokeLocalLib = {
  createCliSmokeEnv: (env?: Record<string, string | undefined>) => Record<string, string | undefined>;
  resolveAgentCliDir: (projectRoot: string, env?: Record<string, string | undefined>) => string;
  resolveSmokeRef: (env?: Record<string, string | undefined>) => string;
};

async function loadSmokeLocalLib(): Promise<SmokeLocalLib> {
  return import(pathToFileURL(path.join(process.cwd(), "scripts", "smoke-local-lib.mjs")).href);
}

test("resolveAgentCliDir defaults to sibling agent-cli repo", async () => {
  const { resolveAgentCliDir } = await loadSmokeLocalLib();
  const projectRoot = "/workspace/agentlib";

  assert.equal(resolveAgentCliDir(projectRoot, {}), "/workspace/agent-cli");
});

test("resolveAgentCliDir honors AGENTLIB_CLI_DIR override", async () => {
  const { resolveAgentCliDir } = await loadSmokeLocalLib();
  const projectRoot = "/workspace/agentlib";

  assert.equal(
    resolveAgentCliDir(projectRoot, {
      AGENTLIB_CLI_DIR: "/tmp/custom-agent-cli"
    }),
    "/tmp/custom-agent-cli"
  );
});

test("resolveSmokeRef defaults to the populated real package", async () => {
  const { resolveSmokeRef } = await loadSmokeLocalLib();
  assert.equal(resolveSmokeRef({}), "raul/code-reviewer@0.3.0");
});

test("resolveSmokeRef honors AGENTLIB_SMOKE_REF override", async () => {
  const { resolveSmokeRef } = await loadSmokeLocalLib();
  assert.equal(
    resolveSmokeRef({
      AGENTLIB_SMOKE_REF: "acme/support-triager@0.2.0"
    }),
    "acme/support-triager@0.2.0"
  );
});

test("createCliSmokeEnv enriches PATH and Go caches for the CLI smoke", async () => {
  const { createCliSmokeEnv } = await loadSmokeLocalLib();
  const baseEnv = {
    PATH: "/usr/bin",
    HOME: "/tmp/example-home",
    AGENTLIB_BASE_URL: "http://127.0.0.1:8787"
  };

  const env = createCliSmokeEnv(baseEnv);

  assert.equal(
    env.PATH,
    `${path.join("/tmp/example-home", ".local", "go", "bin")}${path.delimiter}/usr/bin`
  );
  assert.equal(env.GOCACHE, "/tmp/agent-cli-go-build");
  assert.equal(env.GOMODCACHE, "/tmp/agent-cli-go-mod");
  assert.equal(env.AGENTLIB_BASE_URL, "http://127.0.0.1:8787");
});

test("createCliSmokeEnv honors explicit Go bin and cache overrides", async () => {
  const { createCliSmokeEnv } = await loadSmokeLocalLib();
  const env = createCliSmokeEnv({
    PATH: "/usr/bin",
    HOME: "/tmp/example-home",
    AGENTLIB_GO_BIN_DIR: "/opt/go/bin",
    GOCACHE: "/var/tmp/go-cache",
    GOMODCACHE: "/var/tmp/go-mod"
  });

  assert.equal(env.PATH, `/opt/go/bin${path.delimiter}/usr/bin`);
  assert.equal(env.GOCACHE, "/var/tmp/go-cache");
  assert.equal(env.GOMODCACHE, "/var/tmp/go-mod");
});
