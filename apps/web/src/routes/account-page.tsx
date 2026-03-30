import { useState } from "react";
import type { FormEvent } from "react";

import { Breadcrumbs } from "../components/breadcrumbs.js";
import { buildAgentPath, buildCreatorPath } from "../lib/router.js";
import type {
  AccountProfileUpdateRequest,
  AccountSummaryResponse
} from "../lib/types.js";
import type { Breadcrumb } from "../lib/view-models.js";
import { rankCreators } from "../lib/view-models.js";

type AccountPageProps = {
  account: AccountSummaryResponse;
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
  onUpdateLifecycle: (
    namespace: string,
    name: string,
    lifecycleStatus: "active" | "deprecated" | "unmaintained"
  ) => Promise<void>;
  onUpdateProfile: (payload: AccountProfileUpdateRequest) => Promise<void>;
};

export function AccountPage({
  account,
  breadcrumbs,
  onNavigate,
  onUpdateLifecycle,
  onUpdateProfile
}: AccountPageProps) {
  const { user } = account.account;
  const creatorRank = rankCreators(account.account.ownedAgents)[0] ?? null;
  const [form, setForm] = useState<AccountProfileUpdateRequest["profile"]>({
    displayName: user.displayName,
    bio: user.bio ?? "",
    pronouns: user.pronouns ?? "",
    company: user.company ?? "",
    location: user.location ?? "",
    websiteUrl: user.websiteUrl ?? "",
    timeZoneName: user.timeZoneName ?? "",
    displayLocalTime: user.displayLocalTime,
    statusEmoji: user.statusEmoji ?? "",
    statusText: user.statusText ?? "",
    socialLinks: [...user.socialLinks, "", "", "", ""].slice(0, 4)
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await onUpdateProfile({
        profile: {
          ...form,
          displayName: form.displayName.trim(),
          bio: form.bio?.trim() || undefined,
          pronouns: form.pronouns?.trim() || undefined,
          company: form.company?.trim() || undefined,
          location: form.location?.trim() || undefined,
          websiteUrl: form.websiteUrl?.trim() || undefined,
          timeZoneName: form.timeZoneName?.trim() || undefined,
          statusEmoji: form.statusEmoji?.trim() || undefined,
          statusText: form.statusText?.trim() || undefined,
          socialLinks: form.socialLinks.map((item) => item.trim()).filter(Boolean)
        }
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel stack-lg">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />

      <div className="stack-xs">
        <p className="eyebrow">Account</p>
        <h1>{user.displayName}</h1>
        <p className="lede">
          {user.handle}
          {user.email ? ` · ${user.email}` : ""}
        </p>
        <p>
          {account.account.stats.totalDownloads} downloads, {account.account.stats.totalStars} stars
          and {account.account.stats.totalPins} pins across your catalog.
        </p>
      </div>

      <div className="split-layout">
        <section className="stack-sm">
          <h2>Profile snapshot</h2>
          <div className="detail-list">
            <p>
              <strong>Status</strong>
              <span>
                {user.statusEmoji ? `${user.statusEmoji} ` : ""}
                {user.statusText || "No status yet"}
              </span>
            </p>
            <p>
              <strong>Bio</strong>
              <span>{user.bio || "Add a short bio to explain what you publish."}</span>
            </p>
            <p>
              <strong>Location</strong>
              <span>{user.location || "Not set"}</span>
            </p>
            <p>
              <strong>Website</strong>
              <span>{user.websiteUrl || "Not set"}</span>
            </p>
          </div>
        </section>

        <section className="stack-sm">
          <h2>Linked identities</h2>
          <div className="detail-list">
            {account.account.identities.map((identity) => (
              <p key={`${identity.provider}:${identity.handle}`}>
                <strong>{identity.provider}</strong>
                <span>
                  {identity.handle}
                  {identity.email ? ` · ${identity.email}` : ""}
                </span>
              </p>
            ))}
          </div>
        </section>
      </div>

      <div className="split-layout">
        <section className="stack-sm">
          <div className="section-head">
            <h2>Your stats</h2>
            <span>{account.account.stats.ownedAgentCount} agents</span>
          </div>
          <div className="detail-list">
            <p>
              <strong>{account.account.stats.totalDownloads}</strong>
              <span>Total downloads</span>
            </p>
            <p>
              <strong>{account.account.stats.totalStars}</strong>
              <span>Total stars</span>
            </p>
            <p>
              <strong>{account.account.stats.totalPins}</strong>
              <span>Total pins</span>
            </p>
            <p>
              <strong>{account.account.topAgent?.title ?? "No top agent yet"}</strong>
              <span>
                {account.account.topAgent
                  ? `${account.account.topAgent.downloadCount} downloads`
                  : "Publish or populate demo data to surface one"}
              </span>
            </p>
            <p>
              <strong>{creatorRank ? `#1 ${creatorRank.handle}` : "No creator rank yet"}</strong>
              <span>
                {creatorRank
                  ? `${creatorRank.totalDownloads} downloads across your own catalog`
                  : "Create a catalog to enter the ranking"}
              </span>
            </p>
            <p>
              <strong>Creator page</strong>
              <button
                className="secondary-action"
                onClick={() => onNavigate(buildCreatorPath(user.handle))}
                type="button"
              >
                Open public creator page
              </button>
            </p>
          </div>
        </section>

        <section className="stack-sm">
          <h2>Quick actions</h2>
          <div className="detail-list">
            <p>
              <strong>Manual registry</strong>
              <button className="secondary-action" onClick={() => onNavigate("/publish/manual")} type="button">
                New package
              </button>
            </p>
            <p>
              <strong>GitHub import</strong>
              <button className="secondary-action" onClick={() => onNavigate("/imports/new")} type="button">
                Import repo
              </button>
            </p>
          </div>
        </section>
      </div>

      <section className="stack-sm">
        <h2>Edit profile</h2>
        <form className="stack-sm" onSubmit={(event) => void handleSubmit(event)}>
          <label className="search-field">
            <span>Name</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              type="text"
              value={form.displayName}
            />
          </label>
          <label className="search-field">
            <span>Bio</span>
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              rows={3}
              value={form.bio}
            />
          </label>
          <div className="split-layout">
            <label className="search-field">
              <span>Pronouns</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, pronouns: event.target.value }))}
                type="text"
                value={form.pronouns}
              />
            </label>
            <label className="search-field">
              <span>Company</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                type="text"
                value={form.company}
              />
            </label>
          </div>
          <div className="split-layout">
            <label className="search-field">
              <span>Location</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                type="text"
                value={form.location}
              />
            </label>
            <label className="search-field">
              <span>Website</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
                type="url"
                value={form.websiteUrl}
              />
            </label>
          </div>
          <div className="split-layout">
            <label className="search-field">
              <span>Time zone</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, timeZoneName: event.target.value }))}
                type="text"
                value={form.timeZoneName}
              />
            </label>
            <label className="search-field">
              <span>Status</span>
              <div className="action-row">
                <input
                  onChange={(event) => setForm((current) => ({ ...current, statusEmoji: event.target.value }))}
                  placeholder="🎯"
                  type="text"
                  value={form.statusEmoji}
                />
                <input
                  onChange={(event) => setForm((current) => ({ ...current, statusText: event.target.value }))}
                  placeholder="What are you focusing on?"
                  type="text"
                  value={form.statusText}
                />
              </div>
            </label>
          </div>
          <label className="search-field">
            <span>
              <input
                checked={form.displayLocalTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayLocalTime: event.target.checked }))
                }
                type="checkbox"
              />
              Display local time
            </span>
          </label>
          <div className="stack-xs">
            <span>Social links</span>
            {form.socialLinks.map((link, index) => (
              <input
                key={`social-${index}`}
                onChange={(event) =>
                  setForm((current) => {
                    const next = [...current.socialLinks];
                    next[index] = event.target.value;
                    return { ...current, socialLinks: next };
                  })
                }
                placeholder={`https://social-profile-${index + 1}.example`}
                type="url"
                value={link}
              />
            ))}
          </div>
          <button className="primary-action" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      <section className="stack-sm">
        <div className="section-head">
          <h2>Your agents</h2>
          <span>{account.account.ownedAgents.length} items</span>
        </div>
        <div className="version-list">
          {account.account.ownedAgents.map((agent) => (
            <div className="version-row stack-sm" key={`${agent.namespace}/${agent.name}`}>
              <div className="agent-card-head">
                <span className="agent-slug">
                  {agent.namespace}/{agent.name}
                </span>
                <span className="agent-pill">{agent.lifecycleStatus}</span>
              </div>
              <div className="stack-xs">
                <h2>{agent.title}</h2>
                <p>{agent.description}</p>
                <p>
                  {agent.downloadCount} downloads · {agent.starCount} stars · {agent.pinCount} pins
                </p>
              </div>
              <div className="action-row">
                <button
                  className="secondary-action"
                  onClick={() => onNavigate(buildAgentPath(agent.namespace, agent.name))}
                  type="button"
                >
                  View
                </button>
                <button
                  className="secondary-action"
                  onClick={() => void onUpdateLifecycle(agent.namespace, agent.name, "active")}
                  type="button"
                >
                  Active
                </button>
                <button
                  className="secondary-action"
                  onClick={() => void onUpdateLifecycle(agent.namespace, agent.name, "deprecated")}
                  type="button"
                >
                  Deprecated
                </button>
                <button
                  className="secondary-action"
                  onClick={() =>
                    void onUpdateLifecycle(agent.namespace, agent.name, "unmaintained")
                  }
                  type="button"
                >
                  Unmaintained
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
