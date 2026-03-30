import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/create-app.js";

const authenticatedHeaders = {
  "content-type": "application/json",
  "x-agentlib-auth-provider": "github",
  "x-agentlib-auth-subject": "123456",
  "x-agentlib-auth-handle": "raul",
  "x-agentlib-auth-name": "Raul",
  "x-agentlib-auth-email": "raul@example.com",
  "x-agentlib-auth-avatar": "https://avatars.example.com/raul.png"
};

function createRepository(overrides: Record<string, unknown> = {}) {
  return {
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    ...overrides
  };
}

test("GET /api/v1/account returns the editable profile summary", async () => {
  const app = createApp(
    createRepository({
      getAccountSummary: async () => ({
        user: {
          handle: "raul",
          displayName: "Raul Gimenez",
          email: "raul@example.com",
          avatarUrl: "https://avatars.example.com/raul.png",
          bio: "Building portable agents.",
          pronouns: "he/him",
          company: "AgentLib",
          location: "Barcelona",
          websiteUrl: "https://raulgimenez.com",
          timeZoneName: "Europe/Madrid",
          displayLocalTime: true,
          statusEmoji: "🎯",
          statusText: "Shipping account settings",
          socialLinks: [
            "https://github.com/raulgimenez",
            "https://www.linkedin.com/in/raulgimenez"
          ]
        },
        identities: [
          {
            provider: "github",
            handle: "raulgimenez",
            email: "raul@example.com"
          }
        ],
        ownedAgents: []
      })
    })
  );

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/account", {
      headers: authenticatedHeaders
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    account: {
      user: {
        handle: "raul",
        displayName: "Raul Gimenez",
        email: "raul@example.com",
        avatarUrl: "https://avatars.example.com/raul.png",
        bio: "Building portable agents.",
        pronouns: "he/him",
        company: "AgentLib",
        location: "Barcelona",
        websiteUrl: "https://raulgimenez.com",
        timeZoneName: "Europe/Madrid",
        displayLocalTime: true,
        statusEmoji: "🎯",
        statusText: "Shipping account settings",
        socialLinks: [
          "https://github.com/raulgimenez",
          "https://www.linkedin.com/in/raulgimenez"
        ]
      },
      identities: [
        {
          provider: "github",
          handle: "raulgimenez",
          email: "raul@example.com"
        }
      ],
      ownedAgents: []
    }
  });
});

test("PATCH /api/v1/account updates editable profile fields", async () => {
  let capturedActor: unknown = null;
  let capturedProfile: unknown = null;

  const app = createApp(
    createRepository({
      updateAccountProfile: async (profile: unknown, actor: unknown) => {
        capturedProfile = profile;
        capturedActor = actor;

        return {
          user: {
            handle: "raul",
            displayName: "Raul Gimenez",
            email: "raul@example.com",
            avatarUrl: "https://avatars.example.com/raul.png",
            bio: "Building portable agents.",
            pronouns: "he/him",
            company: "AgentLib",
            location: "Barcelona",
            websiteUrl: "https://raulgimenez.com",
            timeZoneName: "Europe/Madrid",
            displayLocalTime: true,
            statusEmoji: "🎯",
            statusText: "Shipping account settings",
            socialLinks: [
              "https://github.com/raulgimenez",
              "https://www.linkedin.com/in/raulgimenez"
            ]
          },
          identities: [
            {
              provider: "github",
              handle: "raulgimenez",
              email: "raul@example.com"
            }
          ],
          ownedAgents: []
        };
      }
    })
  );

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/account", {
      method: "PATCH",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        profile: {
          displayName: "Raul Gimenez",
          bio: "Building portable agents.",
          pronouns: "he/him",
          company: "AgentLib",
          location: "Barcelona",
          websiteUrl: "https://raulgimenez.com",
          timeZoneName: "Europe/Madrid",
          displayLocalTime: true,
          statusEmoji: "🎯",
          statusText: "Shipping account settings",
          socialLinks: [
            "https://github.com/raulgimenez",
            "https://www.linkedin.com/in/raulgimenez"
          ]
        }
      })
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(capturedActor, {
    provider: "github",
    subject: "123456",
    handle: "raul",
    displayName: "Raul",
    email: "raul@example.com",
    avatarUrl: "https://avatars.example.com/raul.png"
  });
  assert.deepEqual(capturedProfile, {
    displayName: "Raul Gimenez",
    bio: "Building portable agents.",
    pronouns: "he/him",
    company: "AgentLib",
    location: "Barcelona",
    websiteUrl: "https://raulgimenez.com",
    timeZoneName: "Europe/Madrid",
    displayLocalTime: true,
    statusEmoji: "🎯",
    statusText: "Shipping account settings",
    socialLinks: [
      "https://github.com/raulgimenez",
      "https://www.linkedin.com/in/raulgimenez"
    ]
  });
  assert.deepEqual(await response.json(), {
    account: {
      user: {
        handle: "raul",
        displayName: "Raul Gimenez",
        email: "raul@example.com",
        avatarUrl: "https://avatars.example.com/raul.png",
        bio: "Building portable agents.",
        pronouns: "he/him",
        company: "AgentLib",
        location: "Barcelona",
        websiteUrl: "https://raulgimenez.com",
        timeZoneName: "Europe/Madrid",
        displayLocalTime: true,
        statusEmoji: "🎯",
        statusText: "Shipping account settings",
        socialLinks: [
          "https://github.com/raulgimenez",
          "https://www.linkedin.com/in/raulgimenez"
        ]
      },
      identities: [
        {
          provider: "github",
          handle: "raulgimenez",
          email: "raul@example.com"
        }
      ],
      ownedAgents: []
    }
  });
});

test("PATCH /api/v1/account rejects invalid profile payloads", async () => {
  const app = createApp(
    createRepository({
      updateAccountProfile: async () => {
        throw new Error("unexpected");
      }
    })
  );

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/account", {
      method: "PATCH",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        profile: {
          displayName: "",
          socialLinks: ["notaurl"]
        }
      })
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "invalid_account_profile",
      message: "Account profile payload is invalid"
    }
  });
});
