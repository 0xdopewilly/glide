"use client";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { GlideButton } from "@/components/glide-button";
import { FormField, inputClassName } from "@/components/form-field";
import { useAuth } from "@/context/auth-context";
import { useWallet } from "@/context/wallet-context";
import { PLACEHOLDER_GLIDE_TAG } from "@/lib/placeholders";
import { isValidUsername, normalizeUsername } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

export default function SetupUsernamePage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { profile, loading, profileHydrated, updateProfile } = useWallet();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/onboarding");
      return;
    }
    if (profileHydrated && profile.username) {
      router.replace("/");
    }
  }, [ready, user, profileHydrated, profile.username, router]);

  const checkAvailability = useCallback(async (raw: string) => {
    const u = normalizeUsername(raw);
    if (!u) {
      setAvailable(null);
      setHint(null);
      return;
    }
    if (!isValidUsername(u)) {
      setAvailable(false);
      setHint("3–20 characters: a–z, 0–9, underscore only");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`/api/username/check?u=${encodeURIComponent(u)}`);
      const data = (await res.json()) as {
        available?: boolean;
        reason?: string;
      };
      setAvailable(Boolean(data.available));
      setHint(
        data.available
          ? `@${u} is available`
          : (data.reason ?? "That username is taken"),
      );
    } catch {
      setHint("Could not check availability");
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void checkAvailability(username);
    }, 400);
    return () => window.clearTimeout(t);
  }, [username, checkAvailability]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const u = normalizeUsername(username);
    if (!isValidUsername(u) || !available) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      });
      const data = (await res.json()) as {
        username?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not save username");
        return;
      }
      updateProfile({ username: data.username ?? u });
      router.replace("/");
    } catch {
      setError("Could not save username");
    } finally {
      setSubmitting(false);
    }
  };

  const normalized = normalizeUsername(username);
  const canSubmit =
    isValidUsername(normalized) && available === true && !submitting && !checking;

  if (!ready || !user || !profileHydrated) {
    return (
      <OnboardingShell>
        <div className="flex flex-1 items-center justify-center px-7 pb-10 pt-14">
          <p className="text-sm font-medium glide-muted">Loading…</p>
        </div>
      </OnboardingShell>
    );
  }

  if (profile.username) {
    return null;
  }

  return (
    <OnboardingShell>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-1 flex-col px-7 pb-10 pt-14"
      >
        <h1 className="text-2xl font-bold tracking-tight">Pick your pay tag</h1>
        <p className="mt-2 text-sm leading-relaxed glide-muted">
          Friends can send you money with{" "}
          <span className="font-semibold text-[var(--glide-accent)]">@you</span> — no wallet
          address needed.
        </p>

        <div className="mt-8">
          <FormField id="username" label="Pay tag">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium glide-muted">
                @
              </span>
              <input
                id="username"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.replace(/^@+/, "").toLowerCase(),
                  )
                }
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={PLACEHOLDER_GLIDE_TAG}
                className={`${inputClassName} pl-9`}
                maxLength={20}
              />
            </div>
          </FormField>
          {hint ? (
            <p
              className={`mt-2 text-xs font-medium ${
                available
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {checking ? "Checking…" : hint}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-10">
          <GlideButton
            type="submit"
            variant="simple"
            disabled={!canSubmit}
            uppercase={false}
          >
            {submitting ? "Saving…" : "Continue"}
          </GlideButton>
          <p className="mt-3 text-center text-[11px] glide-muted">
            Pay tags are permanent and unique on glidepay.
          </p>
        </div>
      </form>
    </OnboardingShell>
  );
}
