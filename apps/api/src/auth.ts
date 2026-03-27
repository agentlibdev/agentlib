import type { AuthenticatedUser } from "../../../packages/core/src/agent-record.js";
import type { Env } from "./env.js";

type OAuthProvider = "github" | "google";

type OAuthState = {
  provider: OAuthProvider;
  redirectTo: string;
  issuedAt: number;
};

type AuthGatewayOverrides = {
  verifyState?: (state: string) => Promise<Pick<OAuthState, "provider" | "redirectTo">>;
  exchangeGithubCode?: (code: string, redirectUri: string) => Promise<AuthenticatedUser>;
  exchangeGoogleCode?: (code: string, redirectUri: string) => Promise<AuthenticatedUser>;
};

export type AuthGateway = {
  getSession(request: Request): Promise<AuthenticatedUser | null>;
  startAuthorization(provider: OAuthProvider, request: Request): Promise<Response>;
  finishAuthorization(
    provider: OAuthProvider,
    request: Request,
    overrides?: AuthGatewayOverrides
  ): Promise<Response>;
  logout(request: Request): Promise<Response>;
};

const SESSION_COOKIE_NAME = "agentlib_session";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function encodeBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(normalized + padding);
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signValue(secret: string, payload: string): Promise<string> {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${encodeBase64Url(payload)}.${encodeBase64Url(
    String.fromCharCode(...new Uint8Array(signature))
  )}`;
}

async function verifySignedValue(secret: string, signed: string): Promise<string | null> {
  const [payloadPart, signaturePart] = signed.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const payload = decodeBase64Url(payloadPart);
  const expected = await signValue(secret, payload);
  return expected === signed ? payload : null;
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(/;\s*/)) {
    const [cookieName, ...rest] = part.split("=");
    if (cookieName === name) {
      return rest.join("=");
    }
  }

  return null;
}

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
    `Max-Age=${maxAgeSeconds}`
  ].join("; ");
}

function buildClearedCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

function providerRedirectUri(provider: OAuthProvider, request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/v1/auth/${provider}/callback`;
}

async function createState(secret: string, state: OAuthState): Promise<string> {
  return signValue(secret, JSON.stringify(state));
}

async function verifyState(secret: string, signedState: string): Promise<OAuthState | null> {
  const payload = await verifySignedValue(secret, signedState);
  if (!payload) {
    return null;
  }

  const parsed = JSON.parse(payload) as OAuthState;
  if (Date.now() - parsed.issuedAt > STATE_MAX_AGE_MS) {
    return null;
  }

  return parsed;
}

async function createSessionCookie(secret: string, user: AuthenticatedUser): Promise<string> {
  const signed = await signValue(secret, JSON.stringify(user));
  return buildCookie(SESSION_COOKIE_NAME, signed, SESSION_MAX_AGE_SECONDS);
}

async function readCookieSession(
  secret: string | undefined,
  request: Request
): Promise<AuthenticatedUser | null> {
  if (!secret) {
    return null;
  }

  const signed = parseCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!signed) {
    return null;
  }

  const payload = await verifySignedValue(secret, signed);
  if (!payload) {
    return null;
  }

  return JSON.parse(payload) as AuthenticatedUser;
}

function readDevHeaderSession(request: Request): AuthenticatedUser | null {
  const provider = request.headers.get("x-agentlib-auth-provider");
  const subject = request.headers.get("x-agentlib-auth-subject");
  const handle = request.headers.get("x-agentlib-auth-handle");

  if ((provider !== "github" && provider !== "google") || !subject || !handle) {
    return null;
  }

  return {
    provider,
    subject,
    handle,
    displayName: request.headers.get("x-agentlib-auth-name") ?? handle,
    ...(request.headers.get("x-agentlib-auth-email")
      ? { email: request.headers.get("x-agentlib-auth-email") ?? undefined }
      : {}),
    ...(request.headers.get("x-agentlib-auth-avatar")
      ? { avatarUrl: request.headers.get("x-agentlib-auth-avatar") ?? undefined }
      : {})
  };
}

function createAuthorizationUrl(
  provider: OAuthProvider,
  request: Request,
  clientId: string,
  state: string
): string {
  const redirectUri = providerRedirectUri(provider, request);

  if (provider === "github") {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    return url.toString();
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeGithubCode(
  env: Env,
  fetchImplementation: typeof fetch,
  code: string,
  redirectUri: string
): Promise<AuthenticatedUser> {
  const githubHeaders = {
    accept: "application/vnd.github+json",
    "User-Agent": "agentlib-oauth"
  };

  const tokenResponse = await fetchImplementation("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID ?? "",
      client_secret: env.GITHUB_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri
    }).toString()
  });
  const tokenBody = (await tokenResponse.json()) as { access_token?: string };
  const accessToken = tokenBody.access_token;
  if (!accessToken) {
    throw new Error("oauth_exchange_failed");
  }

  const profileResponse = await fetchImplementation("https://api.github.com/user", {
    headers: {
      ...githubHeaders,
      authorization: `Bearer ${accessToken}`,
    }
  });
  if (!profileResponse.ok) {
    throw new Error("github_profile_request_failed");
  }
  const profile = (await profileResponse.json()) as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
    email?: string | null;
  };

  let email = profile.email ?? undefined;
  if (!email) {
    const emailResponse = await fetchImplementation("https://api.github.com/user/emails", {
      headers: {
        ...githubHeaders,
        authorization: `Bearer ${accessToken}`,
      }
    });
    if (!emailResponse.ok) {
      throw new Error("github_profile_request_failed");
    }
    const emails = (await emailResponse.json()) as Array<{ email: string; primary: boolean }>;
    email = emails.find((entry) => entry.primary)?.email ?? emails[0]?.email;
  }

  return {
    provider: "github",
    subject: String(profile.id),
    handle: profile.login,
    displayName: profile.name ?? profile.login,
    ...(email ? { email } : {}),
    ...(profile.avatar_url ? { avatarUrl: profile.avatar_url } : {})
  };
}

async function exchangeGoogleCode(
  env: Env,
  fetchImplementation: typeof fetch,
  code: string,
  redirectUri: string
): Promise<AuthenticatedUser> {
  const tokenResponse = await fetchImplementation("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    }).toString()
  });
  const tokenBody = (await tokenResponse.json()) as { access_token?: string };
  const accessToken = tokenBody.access_token;
  if (!accessToken) {
    throw new Error("oauth_exchange_failed");
  }

  const profileResponse = await fetchImplementation(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    }
  );
  const profile = (await profileResponse.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  const handle = profile.email?.split("@")[0] ?? `google-${profile.sub}`;

  return {
    provider: "google",
    subject: profile.sub,
    handle,
    displayName: profile.name ?? handle,
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.picture ? { avatarUrl: profile.picture } : {})
  };
}

export function createAuthGateway(
  env: Env,
  fetchImplementation: typeof fetch = fetch
): AuthGateway {
  return {
    async getSession(request) {
      return (
        (await readCookieSession(env.AUTH_COOKIE_SECRET, request)) ?? readDevHeaderSession(request)
      );
    },

    async startAuthorization(provider, request) {
      const clientId =
        provider === "github" ? env.GITHUB_CLIENT_ID : env.GOOGLE_CLIENT_ID;
      if (!clientId || !env.AUTH_COOKIE_SECRET) {
        return new Response("OAuth provider is not configured", { status: 501 });
      }

      const redirectTo =
        new URL(request.url).searchParams.get("redirectTo")?.trim() || "/";
      const state = await createState(env.AUTH_COOKIE_SECRET, {
        provider,
        redirectTo,
        issuedAt: Date.now()
      });

      return Response.redirect(createAuthorizationUrl(provider, request, clientId, state), 302);
    },

    async finishAuthorization(provider, request, overrides) {
      if (!env.AUTH_COOKIE_SECRET) {
        return new Response("OAuth provider is not configured", { status: 501 });
      }

      const url = new URL(request.url);
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");

      if (!code || !stateParam) {
        return new Response("Missing OAuth callback parameters", { status: 400 });
      }

      const verifiedState = overrides?.verifyState
        ? await overrides.verifyState(stateParam)
        : await verifyState(env.AUTH_COOKIE_SECRET, stateParam);

      if (!verifiedState || verifiedState.provider !== provider) {
        return new Response("Invalid OAuth state", { status: 400 });
      }

      try {
        const redirectUri = providerRedirectUri(provider, request);
        const actor =
          provider === "github"
            ? await (overrides?.exchangeGithubCode?.(code, redirectUri) ??
                exchangeGithubCode(env, fetchImplementation, code, redirectUri))
            : await (overrides?.exchangeGoogleCode?.(code, redirectUri) ??
                exchangeGoogleCode(env, fetchImplementation, code, redirectUri));

        return new Response(null, {
          status: 302,
          headers: {
            location: verifiedState.redirectTo,
            "set-cookie": await createSessionCookie(env.AUTH_COOKIE_SECRET, actor)
          }
        });
      } catch (error) {
        if (error instanceof Error && error.message === "github_profile_request_failed") {
          return new Response("GitHub profile request failed", { status: 502 });
        }

        if (error instanceof Error && error.message === "oauth_exchange_failed") {
          return new Response("OAuth exchange failed", { status: 502 });
        }

        throw error;
      }
    },

    async logout() {
      return new Response(null, {
        status: 302,
        headers: {
          location: "/",
          "set-cookie": buildClearedCookie(SESSION_COOKIE_NAME)
        }
      });
    }
  };
}
