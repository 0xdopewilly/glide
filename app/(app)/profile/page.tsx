"use client";

import { AccountSecurityCard } from "@/components/account-security-card";
import { CopyButton } from "@/components/copy-button";
import { FormField, inputClassName } from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { PageHeader } from "@/components/page-header";
import { PrivacySettings } from "@/components/privacy-settings";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { PushNotificationsToggle } from "@/components/push-notifications";
import { shortenAddress } from "@/lib/format";
import { useAuth } from "@/context/auth-context";
import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const {
    profile,
    updateProfile,
    saveProfile,
    wallet,
    balance,
    createNewWallet,
    loading,
    error,
    clearError,
  } = useWallet();
  const { signOut } = useAuth();
  const { hideBalance } = usePrivacy();

  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatarUrl ?? null,
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.displayName);
    setEmail(profile.email);
    setAvatarUrl(profile.avatarUrl ?? null);
  }, [profile.displayName, profile.email, profile.avatarUrl]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveProfile({
      displayName: name.trim() || "Guest",
      email: email.trim(),
      avatarUrl,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAvatarPick = (dataUrl: string) => {
    setAvatarUrl(dataUrl);
    updateProfile({ avatarUrl: dataUrl });
  };

  return (
    <>
      <PageHeader title="Profile" backHref="/" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10">
        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Identity hero */}
        <section className="mt-4 rounded-2xl p-5 text-center glide-surface-card">
          <div className="flex justify-center">
            <div className="rounded-full p-1 ring-2 ring-violet-500/25 ring-offset-2 ring-offset-transparent">
              <ProfileAvatarUpload
                displayName={name}
                avatarUrl={avatarUrl}
                onPick={handleAvatarPick}
                disabled={saving}
              />
            </div>
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight">
            {name.trim() || "Guest"}
          </p>
          {profile.username ? (
            <p className="mt-1 text-sm font-medium glide-text-gradient">
              Glide Tag · {profile.username}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/setup-username")}
              className="mt-2 text-sm font-semibold text-violet-600 dark:text-violet-300"
            >
              Claim your Glide Tag →
            </button>
          )}
          <p className="mt-2 text-sm font-medium glide-muted">
            Balance{" "}
            <span className="font-semibold text-neutral-950 dark:text-white">
              {hideBalance ? "••••" : `$${balance.toFixed(2)}`}
            </span>
          </p>
        </section>

        {/* Edit profile */}
        <section className="mt-4 rounded-2xl p-4 glide-surface-card">
          <h2 className="text-sm font-semibold tracking-tight">Your details</h2>
          <p className="mt-0.5 text-xs glide-muted">
            Shown on sends and payment requests.
          </p>
          <div className="mt-4 space-y-3">
            <FormField id="profile-name" label="Display name">
              <input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClassName}
              />
            </FormField>
            <FormField id="profile-email" label="Email">
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClassName}
              />
            </FormField>
          </div>
          <GlideButton
            type="button"
            variant="simple"
            onClick={() => void handleSave()}
            disabled={saving}
            uppercase={false}
            className="mt-4 w-full"
          >
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
          </GlideButton>
        </section>

        {/* Preferences */}
        <section className="mt-4 rounded-2xl p-4 glide-surface-card">
          <h2 className="text-sm font-semibold tracking-tight">Preferences</h2>
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--glide-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] glide-muted">
              Privacy
            </p>
            <PrivacySettings embedded />
          </div>
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--glide-border)" }}>
            <PushNotificationsToggle className="!rounded-xl !bg-white/60 dark:!bg-black/35" />
          </div>
        </section>

        {/* Quick links */}
        <Link
          href="/contacts"
          prefetch
          className="glide-tap mt-4 flex items-center justify-between rounded-2xl px-4 py-3.5 glide-surface-card"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-white/10">
              <Users className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold tracking-tight">Contacts</span>
          </span>
          <ChevronRight className="h-5 w-5 glide-muted" strokeWidth={2} />
        </Link>

        {/* Wallet */}
        <section className="mt-4 rounded-2xl p-4 glide-surface-card">
          <h2 className="text-sm font-semibold tracking-tight">Wallet on Arc</h2>
          <p className="mt-2 break-all font-mono text-xs leading-relaxed glide-muted">
            {wallet?.address ?? "Setting up your smart account…"}
          </p>
          {wallet?.address ? (
            <p className="mt-1 text-xs glide-muted">
              {shortenAddress(wallet.address, 8)}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            {wallet?.address ? (
              <CopyButton value={wallet.address} className="w-full" />
            ) : null}
            <button
              type="button"
              onClick={() => void createNewWallet()}
              disabled={loading}
              className="w-full rounded-2xl border py-3 text-sm font-medium tracking-tight transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
              style={{
                borderColor: "var(--glide-border)",
                color: "var(--glide-text)",
              }}
            >
              {loading ? "Refreshing…" : "Refresh wallet"}
            </button>
          </div>
        </section>

        <AccountSecurityCard />

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 w-full rounded-2xl border py-3.5 text-sm font-semibold glide-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          style={{ borderColor: "var(--glide-border)" }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}
