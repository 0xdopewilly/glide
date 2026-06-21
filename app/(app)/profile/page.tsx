"use client";

import { AccountSecurityCard } from "@/components/account-security-card";
import { AppVersion } from "@/components/app-version";
import { CopyButton } from "@/components/copy-button";
import { FormField, inputClassName } from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { PageHeader } from "@/components/page-header";
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
    // Persist immediately so the new avatar survives a refresh — previously
    // this only updated local state + sessionStorage, requiring the user to
    // tap "Save changes" or lose it on reload.
    void saveProfile({
      displayName: name.trim() || "Guest",
      email: email.trim(),
      avatarUrl: dataUrl,
    });
  };

  return (
    <>
      <PageHeader title="Profile" backHref="/" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10">
        {error ? (
          <div
            className="mt-3 rounded-2xl border px-3 py-2 text-sm"
            style={{
              background:
                "color-mix(in srgb, var(--glide-error) 12%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--glide-error) 28%, transparent)",
              color: "var(--glide-error)",
            }}
          >
            {error}
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Identity hero */}
        <section className="mt-4 rounded-2xl p-5 text-center glide-surface-card">
          <div className="flex justify-center">
            <div
              className="rounded-full p-1 ring-2 ring-offset-2 ring-offset-transparent"
              style={{
                ["--tw-ring-color" as string]:
                  "color-mix(in srgb, var(--glide-text) 18%, transparent)",
              }}
            >
              <ProfileAvatarUpload
                displayName={name}
                avatarUrl={avatarUrl}
                onPick={handleAvatarPick}
                disabled={saving}
              />
            </div>
          </div>
          <p className="mt-4 text-[20px] font-bold tracking-tight text-[var(--glide-text)]">
            {name.trim() || "Guest"}
          </p>
          {profile.username ? (
            <p className="glide-label-mono mt-2 text-[11px] font-semibold text-[var(--glide-muted)]">
              Pay tag ·{" "}
              <span className="text-[var(--glide-text)]">
                @{profile.username}
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/setup-username")}
              className="glide-label-mono mt-2 text-[11px] font-bold text-[var(--glide-text)] underline"
            >
              Claim your pay tag →
            </button>
          )}
          <p className="mt-2 text-sm font-medium text-[var(--glide-muted)]">
            Balance{" "}
            <span className="font-bold text-[var(--glide-text)]">
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
            <PushNotificationsToggle className="!rounded-xl" />
          </div>
        </section>

        {/* Quick links */}
        <Link
          href="/contacts"
          prefetch
          className="glide-tap mt-4 flex items-center justify-between rounded-2xl px-4 py-3.5 glide-surface-card"
        >
          <span className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--glide-surface-container-high)" }}
            >
              <Users className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-[var(--glide-text)]">
              Contacts
            </span>
          </span>
          <ChevronRight className="h-5 w-5 glide-muted" strokeWidth={2} />
        </Link>

        {/* Wallet */}
        <section className="mt-4 rounded-2xl p-4 glide-surface-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--glide-text)]">
              Wallet on Arc
            </h2>
            {wallet?.address ? (
              <span className="glide-label-mono text-[10px] font-bold text-[var(--glide-muted)]">
                {shortenAddress(wallet.address, 6)}
              </span>
            ) : null}
          </div>
          <p className="mt-3 break-all font-mono text-xs leading-relaxed text-[var(--glide-muted)]">
            {wallet?.address ?? "Setting up your smart account…"}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {wallet?.address ? (
              <CopyButton value={wallet.address} className="w-full" />
            ) : null}
            <button
              type="button"
              onClick={() => void createNewWallet()}
              disabled={loading}
              className="glide-tap w-full rounded-2xl border py-3 text-sm font-medium tracking-tight disabled:opacity-50"
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

        <div className="mt-4 flex flex-col gap-3 text-center text-[11px] text-[var(--glide-muted)]">
          <div className="flex justify-center gap-4">
            <a
              href="https://glidepay.cash/privacy"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--glide-text)]"
            >
              Privacy
            </a>
            <a
              href="https://glidepay.cash/terms"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--glide-text)]"
            >
              Terms
            </a>
            <a
              href="https://glidepay.cash/support"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--glide-text)]"
            >
              Support
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 w-full rounded-2xl border py-3.5 text-sm font-semibold glide-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          style={{ borderColor: "var(--glide-border)" }}
        >
          Sign out
        </button>

        <DeleteAccountButton />

        <AppVersion />
      </div>
    </>
  );
}

function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete your account. Try again.");
        setDeleting(false);
        return;
      }
      // Hard reload to /onboarding so the (now-deleted) Clerk session is
      // cleared by the middleware redirect.
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-2 w-full rounded-2xl py-3 text-[12px] font-semibold transition-colors hover:text-red-500"
        style={{ color: "var(--glide-muted)" }}
      >
        Delete account
      </button>
    );
  }

  return (
    <div
      className="mt-2 rounded-2xl border p-4"
      style={{
        background: "var(--glide-surface-elevated)",
        borderColor: "var(--glide-elevated-border)",
      }}
    >
      <p className="text-[14px] font-semibold text-[var(--glide-text)]">
        Permanently delete your account?
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--glide-muted)]">
        Removes your glidepay profile, activity history, contacts, push
        subscriptions, and any saved data. On-chain balances stay on Arc
        and aren&apos;t ours to delete — withdraw them first if you want them.
      </p>
      {error ? (
        <p className="mt-2 text-[12px] font-semibold text-red-500">{error}</p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="glide-tap glide-label-mono flex-1 rounded-full bg-red-500 py-2.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="glide-tap glide-label-mono flex-1 rounded-full border py-2.5 text-[11px] font-bold disabled:opacity-50"
          style={{
            background: "var(--glide-surface-container)",
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
