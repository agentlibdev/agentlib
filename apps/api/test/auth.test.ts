import assert from "node:assert/strict";
import test from "node:test";

import { createAuthGateway } from "../src/auth.js";

const env = {
  AUTH_COOKIE_SECRET: "top-secret",
  GITHUB_CLIENT_ID: "github-client-id",
  GITHUB_CLIENT_SECRET: "github-client-secret",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret"
};

test("auth gateway reads a signed session cookie", async () => {
  const gateway = createAuthGateway(env);
  const callbackResponse = await gateway.finishAuthorization(
    "github",
    new Request("https://agentlib.dev/api/v1/auth/github/callback?code=test-code&state=placeholder"),
    {
      exchangeGithubCode: async () => ({
        provider: "github",
        subject: "123456",
        handle: "raul",
        displayName: "Raul",
        email: "raul@example.com"
      }),
      verifyState: async () => ({
        provider: "github",
        redirectTo: "/publish/manual"
      })
    }
  );

  const sessionCookie = callbackResponse.headers.get("set-cookie");
  assert.ok(sessionCookie);

  const session = await gateway.getSession(
    new Request("https://agentlib.dev/api/v1/session", {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  assert.deepEqual(session, {
    provider: "github",
    subject: "123456",
    handle: "raul",
    displayName: "Raul",
    email: "raul@example.com"
  });
});

test("auth gateway starts a GitHub OAuth redirect", async () => {
  const gateway = createAuthGateway(env);

  const response = await gateway.startAuthorization(
    "github",
    new Request("https://agentlib.dev/api/v1/auth/github/start?redirectTo=%2Fpublish%2Fmanual")
  );

  assert.equal(response.status, 302);
  const location = response.headers.get("location");
  assert.ok(location);
  assert.match(location, /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
  assert.match(location, /client_id=github-client-id/);
  assert.match(location, /redirect_uri=https%3A%2F%2Fagentlib\.dev%2Fapi%2Fv1%2Fauth%2Fgithub%2Fcallback/);
  assert.match(location, /state=/);
});

test("auth gateway completes a GitHub callback and redirects with a session cookie", async () => {
  const gateway = createAuthGateway(env);
  const startResponse = await gateway.startAuthorization(
    "github",
    new Request("https://agentlib.dev/api/v1/auth/github/start?redirectTo=%2Fpublish%2Fmanual")
  );
  const state = new URL(startResponse.headers.get("location") ?? "").searchParams.get("state");

  const response = await gateway.finishAuthorization(
    "github",
    new Request(
      `https://agentlib.dev/api/v1/auth/github/callback?code=test-code&state=${encodeURIComponent(state ?? "")}`
    ),
    {
      exchangeGithubCode: async (code: string) => {
        assert.equal(code, "test-code");
        return {
          provider: "github",
          subject: "123456",
          handle: "raul",
          displayName: "Raul",
          email: "raul@example.com"
        };
      }
    }
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/publish/manual");
  assert.match(response.headers.get("set-cookie") ?? "", /agentlib_session=/);
});

test("auth gateway surfaces a readable error when GitHub profile exchange fails", async () => {
  const gateway = createAuthGateway(env, (async (input, init) => {
    const url = String(input);

    if (url === "https://github.com/login/oauth/access_token") {
      return new Response(JSON.stringify({ access_token: "token-123" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url === "https://api.github.com/user") {
      assert.equal(init?.headers && "User-Agent" in (init.headers as Record<string, string>), true);
      return new Response("Request forbidden by administrative rules", {
        status: 403,
        headers: { "content-type": "text/plain" }
      });
    }

    return new Response("unexpected", { status: 500 });
  }) as typeof fetch);

  const startResponse = await gateway.startAuthorization(
    "github",
    new Request("https://agentlib.dev/api/v1/auth/github/start?redirectTo=%2F")
  );
  const state = new URL(startResponse.headers.get("location") ?? "").searchParams.get("state");

  const response = await gateway.finishAuthorization(
    "github",
    new Request(
      `https://agentlib.dev/api/v1/auth/github/callback?code=test-code&state=${encodeURIComponent(state ?? "")}`
    )
  );

  assert.equal(response.status, 502);
  assert.equal(await response.text(), "GitHub profile request failed");
});
