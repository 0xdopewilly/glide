"use client";

import { AppVersion } from "@/components/app-version";
import { PageHeader } from "@/components/page-header";
import { PinSettings } from "@/components/pin-settings";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { PushNotificationsToggle } from "@/components/push-notifications";
import { SettingsRow, SettingsSection } from "@/components/settings-list";
import { useAuth } from "@/context/auth-context";
import { useWallet } from "@/context/wallet-context";
import { copyText } from "@/lib/clipboard";
import { fetchWithPin } from "@/lib/pin-gate";
import {
  Check,
  Copy,
  FileText,
  LifeBuoy,
  LogOut,
  Palette,
  Shield,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const SITE = "https://glidepay.cash";

export default function ProfilePage() {
  const { profile, saveProfile, error, clearError } = useWallet();
  const { signOut } = useAuth();
  // Shows a just-picked photo while it saves, then falls back to the profile.
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const avatarUrl = pickedAvatar ?? profile.avatarUrl ?? null;

  const name = profile.displayName?.trim() || "Guest";

  const handleAvatarPick = (dataUrl: string) => {
    setPickedAvatar(dataUrl);
    setSavingPhoto(true);
    void saveProfile({ avatarUrl: dataUrl }).finally(() => {
      setSavingPhoto(false);
      setPickedAvatar(null);
    });
  };

  return (
    <>
      <PageHeader title="Profile" />
      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(2rem,var(--glide-safe-bottom))]">
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

        <section className="mt-2 flex shrink-0 flex-col items-center text-center">
          <ProfileAvatarUpload
            displayName={name}
            avatarUrl={avatarUrl}
            onPick={handleAvatarPick}
            disabled={savingPhoto}
          />
          <p className="mt-3 max-w-full truncate text-[22px] font-bold tracking-tight text-[var(--glide-text)]">
            {name}
          </p>
          {profile.username ? (
            <PayTagChip username={profile.username} />
          ) : (
            <Link
              href="/setup-username"
              className="glide-tap mt-2 text-[13px] font-semibold"
              style={{ color: "var(--glide-accent)" }}
            >
              Claim your pay tag
            </Link>
          )}
        </section>

        <SettingsSection>
          <SettingsRow
            icon={Wallet}
            title="Account details"
            subtitle="Your address and QR code"
            href="/receive"
          />
          <SettingsRow
            icon={UserRound}
            title="Personal details"
            subtitle="Name, photo and email"
            href="/profile/details"
          />
          <SettingsRow
            icon={Users}
            title="Contacts"
            subtitle="People you pay"
            href="/contacts"
          />
        </SettingsSection>

        <SettingsSection title="Security">
          <PinSettings />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <PushNotificationsToggle />
          <AppearanceRow />
        </SettingsSection>

        <SettingsSection title="Help">
          <SettingsRow
            icon={LifeBuoy}
            title="Help & support"
            href={`${SITE}/support`}
            external
          />
          <SettingsRow
            icon={ShieldCheck}
            title="How your account works"
            href="/profile/about"
          />
          <SettingsRow
            icon={FileText}
            title="Terms of service"
            href={`${SITE}/terms`}
            external
          />
          <SettingsRow
            icon={Shield}
            title="Privacy policy"
            href={`${SITE}/privacy`}
            external
          />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            icon={LogOut}
            title="Sign out"
            onClick={() => void signOut()}
            destructive
          />
        </SettingsSection>

        <CloseAccount />
        <AppVersion />
      </div>
    </>
  );
}

function PayTagChip({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void copyText(`@${username}`).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="glide-tap mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold"
      style={{
        background: "var(--glide-surface-container-high)",
        color: "var(--glide-text)",
      }}
      aria-label={`Copy pay tag @${username}`}
    >
      @{username}
      {copied ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5 opacity-60" strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}

const noopSubscribe = () => () => {};

const THEME_OPTIONS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Auto" },
] as const;

function AppearanceRow() {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored theme after mount; render "Auto" until
  // then so server and client markup match.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const current = mounted ? (theme ?? "system") : "system";

  return (
    <SettingsRow
      icon={Palette}
      title="Appearance"
      trailing={
        <span
          className="glide-m3-segment flex rounded-full p-0.5"
          role="radiogroup"
          aria-label="Appearance"
        >
          {THEME_OPTIONS.map(({ id, label }) => {
            const active = current === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(id)}
                className="glide-tap rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={
                  active
                    ? { background: "var(--glide-accent)", color: "var(--glide-on-primary)" }
                    : { color: "var(--glide-muted)" }
                }
              >
                {label}
              </button>
            );
          })}
        </span>
      }
    />
  );
}

function CloseAccount() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetchWithPin("/api/account/delete", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not close your account. Try again.");
        setDeleting(false);
        return;
      }
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close your account.");
      setDeleting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="glide-tap mx-auto mt-6 px-4 py-2 text-[13px] font-semibold"
        style={{ color: "var(--glide-muted)" }}
      >
        Close account
      </button>
    );
  }

  return (
    <div className="glide-surface-card mt-6 shrink-0 rounded-2xl p-4">
      <p className="text-[15px] font-semibold text-[var(--glide-text)]">
        Close your account?
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--glide-muted)]">
        This permanently removes your profile, activity and contacts. Move your
        money out first — an account with a balance can&apos;t be closed.
      </p>
      {error ? (
        <p className="mt-2 text-[13px] font-semibold" style={{ color: "var(--glide-error)" }}>
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="glide-tap flex-1 rounded-full py-2.5 text-[14px] font-semibold disabled:opacity-50"
          style={{
            background: "var(--glide-surface-container-high)",
            color: "var(--glide-text)",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="glide-tap flex-1 rounded-full py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--glide-error)" }}
        >
          {deleting ? "Closing…" : "Close account"}
        </button>
      </div>
    </div>
  );
}
