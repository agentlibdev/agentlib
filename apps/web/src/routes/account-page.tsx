import { useState } from "react";
import type { FormEvent } from "react";
import { Activity, Link2, UserCircle2 } from "lucide-react";

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
    <section className="page-stack">
      <section className="app-panel p-6 sm:p-8">
        <div className="page-stack">
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <p className="eyebrow">Account</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {user.displayName}
              </h1>
              <p className="lede">
                {user.handle}
                {user.email ? ` · ${user.email}` : ""}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="metric-card">
                  <p className="eyebrow">Downloads</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                    {account.account.stats.totalDownloads}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="eyebrow">Stars</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                    {account.account.stats.totalStars}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="eyebrow">Pins</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                    {account.account.stats.totalPins}
                  </p>
                </div>
              </div>
            </div>

            <aside className="app-panel-muted p-5">
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <UserCircle2 className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
                  <span className="font-medium">Public profile</span>
                </div>
                <p>{user.bio || "Add a short bio to explain what you publish."}</p>
                <p>{user.location || "Location not set"}</p>
                <button
                  className="app-button-secondary w-full"
                  onClick={() => onNavigate(buildCreatorPath(user.handle))}
                  type="button"
                >
                  Open public creator page
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <section className="app-panel p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Edit profile</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
                <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} type="text" value={form.displayName} />
              </label>
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Bio</span>
                <textarea className="app-textarea" onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={3} value={form.bio} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Pronouns</span>
                <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, pronouns: event.target.value }))} type="text" value={form.pronouns} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Company</span>
                <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} type="text" value={form.company} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Location</span>
                <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} type="text" value={form.location} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Website</span>
                <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} type="url" value={form.websiteUrl} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Time zone</span>
                <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, timeZoneName: event.target.value }))} type="text" value={form.timeZoneName} />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Status emoji</span>
                  <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, statusEmoji: event.target.value }))} placeholder="🎯" type="text" value={form.statusEmoji} />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Status text</span>
                  <input className="app-input" onChange={(event) => setForm((current) => ({ ...current, statusText: event.target.value }))} placeholder="What are you focusing on?" type="text" value={form.statusText} />
                </label>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <label className="inline-flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                <input checked={form.displayLocalTime} onChange={(event) => setForm((current) => ({ ...current, displayLocalTime: event.target.checked }))} type="checkbox" />
                Display local time
              </label>
              <div className="space-y-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Social links</span>
                {form.socialLinks.map((link, index) => (
                  <input
                    key={`social-${index}`}
                    className="app-input"
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
            </div>

            <div className="mt-6">
              <button className="app-button-primary" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </section>
        </form>

        <aside className="space-y-6">
          <section className="app-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-500 dark:text-violet-300" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Linked identities</h2>
            </div>
            <div className="space-y-3">
              {account.account.identities.map((identity) => (
                <div className="artifact-row" key={`${identity.provider}:${identity.handle}`}>
                  <span>{identity.provider}</span>
                  <span>
                    {identity.handle}
                    {identity.email ? ` · ${identity.email}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Workspace</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>{account.account.stats.ownedAgentCount} owned agents</p>
              <p>{account.account.topAgent?.title ?? "No top agent yet"}</p>
              <p>{creatorRank ? `${creatorRank.totalDownloads} downloads across your catalog` : "No creator rank yet"}</p>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <button className="app-button-secondary" onClick={() => onNavigate("/publish/manual")} type="button">
                New package
              </button>
              <button className="app-button-secondary" onClick={() => onNavigate("/imports/new")} type="button">
                Import repo
              </button>
            </div>
          </section>
        </aside>
      </section>

      <section className="app-panel p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Your agents</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage lifecycle and review package performance from your workspace.
            </p>
          </div>
          <span className="status-pill">{account.account.ownedAgents.length} items</span>
        </div>

        <div className="space-y-4">
          {account.account.ownedAgents.map((agent) => (
            <div className="artifact-row flex-col items-stretch" key={`${agent.namespace}/${agent.name}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
                    {agent.namespace}/{agent.name}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
                    {agent.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{agent.description}</p>
                </div>
                <span className="status-pill">{agent.lifecycleStatus}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span>{agent.downloadCount} downloads</span>
                <span>{agent.starCount} stars</span>
                <span>{agent.pinCount} pins</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button className="app-button-secondary" onClick={() => onNavigate(buildAgentPath(agent.namespace, agent.name))} type="button">
                  View
                </button>
                <button className="app-button-secondary" onClick={() => void onUpdateLifecycle(agent.namespace, agent.name, "active")} type="button">
                  Active
                </button>
                <button className="app-button-secondary" onClick={() => void onUpdateLifecycle(agent.namespace, agent.name, "deprecated")} type="button">
                  Deprecated
                </button>
                <button className="app-button-secondary" onClick={() => void onUpdateLifecycle(agent.namespace, agent.name, "unmaintained")} type="button">
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
