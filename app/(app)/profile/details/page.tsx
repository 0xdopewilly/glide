"use client";

import { GlideButton } from "@/components/glide-button";
import { PageHeader } from "@/components/page-header";
import { useWallet } from "@/context/wallet-context";
import Link from "next/link";
import { useState } from "react";

export default function PersonalDetailsPage() {
  const { profile, saveProfile, error, clearError } = useWallet();
  // null = untouched, so the field follows the profile as it loads.
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const name = draft ?? profile.displayName ?? "";
  const trimmed = name.trim();
  const dirty = trimmed !== (profile.displayName ?? "").trim();

  const handleSave = async () => {
    if (!trimmed) return;
    setSaving(true);
    const ok = await saveProfile({ displayName: trimmed });
    setSaving(false);
    if (ok) {
      setDraft(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <>
      <PageHeader title="Personal details" backHref="/profile" />
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

        <div className="glide-surface-card mt-4 shrink-0 overflow-hidden rounded-2xl">
          <Field label="Name" htmlFor="pd-name">
            <input
              id="pd-name"
              value={name}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              maxLength={60}
              className="mt-0.5 w-full bg-transparent text-[16px] font-medium text-[var(--glide-text)] outline-none placeholder:text-[var(--glide-muted)]"
            />
          </Field>
          <Hairline />
          <Field label="Email" hint="Used to sign in">
            <p className="mt-0.5 truncate text-[16px] font-medium text-[var(--glide-text)]">
              {profile.email || "—"}
            </p>
          </Field>
          <Hairline />
          <Field label="Pay tag" hint={profile.username ? "People pay you with this" : undefined}>
            {profile.username ? (
              <p className="mt-0.5 text-[16px] font-medium text-[var(--glide-text)]">
                @{profile.username}
              </p>
            ) : (
              <Link
                href="/setup-username"
                className="mt-0.5 inline-block text-[15px] font-semibold"
                style={{ color: "var(--glide-accent)" }}
              >
                Claim your pay tag
              </Link>
            )}
          </Field>
        </div>

        {dirty ? (
          <GlideButton
            type="button"
            variant="primary"
            onClick={() => void handleSave()}
            disabled={saving || !trimmed}
            uppercase={false}
            className="mt-5"
          >
            {saving ? "Saving…" : "Save"}
          </GlideButton>
        ) : saved ? (
          <p className="mt-4 text-center text-[13px] font-semibold text-[var(--glide-success)]">
            Saved
          </p>
        ) : null}
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <label
        htmlFor={htmlFor}
        className="block text-[12px] font-semibold text-[var(--glide-muted)]"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-0.5 text-[12px] text-[var(--glide-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function Hairline() {
  return <div className="ml-4 h-px" style={{ background: "var(--glide-border)" }} />;
}
