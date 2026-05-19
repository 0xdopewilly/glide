"use client";

import { AccountSecurityCard } from "@/components/account-security-card";
import { CopyButton } from "@/components/copy-button";
import { FormField, inputClassName } from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { PageHeader } from "@/components/page-header";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { PushNotificationsToggle } from "@/components/push-notifications";
import { shortenAddress } from "@/lib/format";
import { PrivacySettings } from "@/components/privacy-settings";
import { ScheduledTransfersCard } from "@/components/scheduled-transfers-card";
import { useAuth } from "@/context/auth-context";
import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
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
      <PageHeader title="Profile" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col items-center">
          <ProfileAvatarUpload
            displayName={name}
            avatarUrl={avatarUrl}
            onPick={handleAvatarPick}
            disabled={saving}
          />
          <p className="mt-4 text-base font-semibold tracking-tight">
            {name.trim() || "Guest"}
          </p>
          {profile.username ? (
            <p className="mt-0.5 text-sm font-medium text-violet-500 dark:text-violet-300">
              @{profile.username}
            </p>
          ) : null}
          <p className="mt-1 text-sm font-medium glide-muted">
            Balance {hideBalance ? "••••" : `$${balance.toFixed(2)}`}
          </p>
        </div>

        <div className="mt-8 space-y-4">
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
          <GlideButton
            type="button"
            variant="simple"
            onClick={() => void handleSave()}
            disabled={saving}
            uppercase={false}
          >
            {saved ? "Saved" : saving ? "Saving…" : "Save Profile"}
          </GlideButton>
        </div>

        <section className="mt-6 space-y-3">
          <PrivacySettings />
          <ScheduledTransfersCard />
          <PushNotificationsToggle />
          <GlideButton
            type="button"
            variant="simple"
            onClick={() => router.push("/contacts")}
            uppercase={false}
            className="w-full"
          >
            Contacts
          </GlideButton>
        </section>

        <section className="mt-6 rounded-2xl p-4 glide-surface-card">
          <h3 className="text-sm font-semibold tracking-tight">Your account</h3>
          <p className="mt-2 break-all font-mono text-xs font-medium leading-relaxed glide-muted">
            {wallet?.address ?? "Setting up"}
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
              className="w-full rounded-2xl border py-3 text-sm font-medium tracking-tight transition-colors"
              style={{
                borderColor: "var(--glide-border)",
                color: "var(--glide-text)",
              }}
            >
              Refresh wallet
            </button>
          </div>
        </section>

        <AccountSecurityCard />

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-8 w-full rounded-xl border py-3.5 text-sm font-semibold glide-muted"
          style={{ borderColor: "var(--glide-border)" }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}
