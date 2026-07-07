"use client";

import { AccountSecurityCard } from "@/components/account-security-card";
import { AppVersion } from "@/components/app-version";
import { CopyButton } from "@/components/copy-button";
import { GlideButton } from "@/components/glide-button";
import { PageHeader } from "@/components/page-header";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { PushNotificationsToggle } from "@/components/push-notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
import { ChevronRight, Moon, Sun, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, saveProfile, wallet, balance, error, clearError } =
    useWallet();
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

  const dirty = name !== profile.displayName || email !== profile.email;

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
              background: "color-mix(in srgb, var(--glide-error) 12%, transparent)",
              borderColor: "color-mix(in srgb, var(--glide-error) 28%, transparent)",
              color: "var(--glide-error)",
            }}
          >
            {error}
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Branded hero */}
        <section
          className="mt-4 shrink-0 overflow-hidden rounded-3xl px-6 py-7 text-center"
          style={{
            background:
              "linear-gradient(150deg, #7C5CFF 0%, #5B3DF5 48%, #4A2EE0 100%)",
          }}
        >
          <div className="flex justify-center">
            <div className="rounded-full p-1 ring-2 ring-white/40">
              <ProfileAvatarUpload
                displayName={name}
                avatarUrl={avatarUrl}
                onPick={handleAvatarPick}
                disabled={saving}
              />
            </div>
          </div>
          <p className="mt-4 text-[22px] font-bold tracking-tight text-white">
            {name.trim() || "Guest"}
          </p>
          {profile.username ? (
            <p className="mt-1 text-[13px] font-semibold text-white/70">
              @{profile.username}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/setup-username")}
              className="mt-1 text-[13px] font-bold text-white underline"
            >
              Claim your pay tag →
            </button>
          )}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5">
            <span className="text-[12px] font-medium text-white/75">Balance</span>
            <span className="text-[13px] font-bold tabular-nums text-white">
              {hideBalance ? "••••" : `$${balance.toFixed(2)}`}
            </span>
          </div>
        </section>

        {/* Account */}
        <Caption>Account</Caption>
        <GroupCard>
          <div className="px-4 py-2.5">
            <label
              htmlFor="p-name"
              className="block text-[11px] font-semibold text-[var(--glide-muted)]"
            >
              Display name
            </label>
            <input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-0.5 w-full bg-transparent text-[15px] font-medium text-[var(--glide-text)] outline-none placeholder:text-[var(--glide-muted)]"
            />
          </div>
          <Divider />
          <div className="px-4 py-2.5">
            <label
              htmlFor="p-email"
              className="block text-[11px] font-semibold text-[var(--glide-muted)]"
            >
              Email
            </label>
            <input
              id="p-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-0.5 w-full bg-transparent text-[15px] font-medium text-[var(--glide-text)] outline-none placeholder:text-[var(--glide-muted)]"
            />
          </div>
          <Divider />
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[15px] font-medium text-[var(--glide-text)]">
              Pay tag
            </span>
            {profile.username ? (
              <span className="glide-label-mono text-[13px] font-semibold text-[var(--glide-muted)]">
                @{profile.username}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/setup-username")}
                className="text-[13px] font-bold text-[var(--glide-accent)]"
              >
                Claim →
              </button>
            )}
          </div>
        </GroupCard>
        {dirty ? (
          <GlideButton
            type="button"
            variant="simple"
            onClick={() => void handleSave()}
            disabled={saving}
            uppercase={false}
            className="mt-3 w-full"
          >
            {saving ? "Saving…" : "Save changes"}
          </GlideButton>
        ) : saved ? (
          <p className="mt-3 text-center text-xs font-semibold text-[var(--glide-success)]">
            Saved ✓
          </p>
        ) : null}

        {/* Preferences */}
        <Caption>Preferences</Caption>
        <GroupCard>
          <PushNotificationsToggle className="!rounded-none !bg-transparent dark:!bg-transparent" />
          <Divider />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "var(--glide-surface-container-high)" }}
              >
                <Sun className="h-4 w-4 dark:hidden" strokeWidth={2} />
                <Moon className="hidden h-4 w-4 dark:block" strokeWidth={2} />
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold tracking-tight text-[var(--glide-text)]">
                  Appearance
                </span>
                <span className="block text-xs text-[var(--glide-muted)]">
                  Light or dark theme
                </span>
              </span>
            </span>
            <ThemeToggle />
          </div>
        </GroupCard>

        {/* Wallet */}
        <Caption>Wallet</Caption>
        <GroupCard>
          <div className="px-4 py-3">
            <span className="text-[13px] font-semibold text-[var(--glide-muted)]">
              Arc address
            </span>
            <p className="mt-1 break-all font-mono text-xs leading-relaxed text-[var(--glide-text)]">
              {wallet?.address ?? "Setting up your smart account…"}
            </p>
            {wallet?.address ? (
              <div className="mt-3">
                <CopyButton value={wallet.address} className="w-full" />
              </div>
            ) : null}
          </div>
          <Divider />
          <LinkRow href="/contacts" icon={Users} label="Contacts" />
        </GroupCard>

        {/* How your account works */}
        <div className="mt-2">
          <AccountSecurityCard />
        </div>

        {/* Legal */}
        <div className="mt-6 flex justify-center gap-4 text-[11px] text-[var(--glide-muted)]">
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

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-5 w-full rounded-2xl border py-3.5 text-sm font-semibold text-[var(--glide-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
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

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="glide-label-mono mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--glide-muted)]">
      {children}
    </p>
  );
}

function GroupCard({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-2xl glide-surface-card">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="ml-4 h-px" style={{ background: "var(--glide-border)" }} />;
}

function LinkRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="glide-tap flex items-center justify-between px-4 py-3.5"
    >
      <span className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "var(--glide-surface-container-high)" }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-[var(--glide-text)]">
          {label}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 text-[var(--glide-muted)]" strokeWidth={2} />
    </Link>
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
        subscriptions, and any saved data. On-chain balances stay on Arc and
        aren&apos;t ours to delete — withdraw them first if you want them.
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
