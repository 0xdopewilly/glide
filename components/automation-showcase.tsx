"use client";

import { useAuth } from "@/context/auth-context";
import { readUiCache, writeUiCache } from "@/lib/ui-cache";
import { ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Rule = { id: string; name: string; active: boolean };
type Insights = {
  completed: number;
  activeRules: number;
  recurringPayments: number;
  totalSaved: number;
};

type ShowcaseSummary = {
  activeCount: number;
  topName: string | null;
  totalSaved: number;
};

const CACHE_KEY = "automation-showcase";
const CACHE_MAX_AGE_MS = 1000 * 60 * 30;

/** Home-screen flagship: surfaces the automation engine. Shows active rules +
 * total auto-saved when the user has automations, or a magnetic prompt to set
 * one up. Seeds from a user-scoped cache so the right state paints instantly on
 * repeat visits instead of swapping in after the fetch. Taps through to the
 * Automations dashboard. */
export function AutomationShowcase() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [summary, setSummary] = useState<ShowcaseSummary | null>(() =>
    readUiCache<ShowcaseSummary>(CACHE_KEY, userId, CACHE_MAX_AGE_MS),
  );

  useEffect(() => {
    const cached = readUiCache<ShowcaseSummary>(
      CACHE_KEY,
      userId,
      CACHE_MAX_AGE_MS,
    );
    if (cached) setSummary((prev) => prev ?? cached);

    void (async () => {
      try {
        const res = await fetch("/api/automations");
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as {
          rules?: Rule[];
          insights?: Insights;
        };
        const active = (data.rules ?? []).filter((r) => r.active);
        const next: ShowcaseSummary = {
          activeCount: active.length,
          topName: active[0]?.name ?? null,
          totalSaved: data.insights?.totalSaved ?? 0,
        };
        setSummary(next);
        writeUiCache(CACHE_KEY, userId, next);
      } catch {
        /* keep cached/empty state */
      }
    })();
  }, [userId]);

  const hasAny = (summary?.activeCount ?? 0) > 0;
  const saved = summary?.totalSaved ?? 0;

  return (
    <Link
      href="/automations"
      prefetch
      className="glide-tap mt-4 flex shrink-0 items-center gap-3 rounded-3xl border p-4"
      style={{
        background: "var(--glide-surface-elevated)",
        borderColor: "var(--glide-elevated-border)",
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{
          background: "var(--glide-accent)",
          color: "var(--glide-on-primary)",
        }}
      >
        <Zap className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold tracking-tight text-[var(--glide-text)]">
          {hasAny ? "Your money's working" : "Put your money on autopilot"}
        </p>
        {hasAny ? (
          <p className="mt-0.5 truncate text-xs text-[var(--glide-muted)]">
            {summary?.activeCount} active
            {saved > 0 ? ` · $${saved.toFixed(2)} auto-saved` : ""}
            {summary?.topName ? ` · ${summary.topName}` : ""}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-[var(--glide-muted)]">
            Auto-save, pay bills on schedule, set your own rules — hands-free.
          </p>
        )}
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[var(--glide-muted)]"
        strokeWidth={2}
      />
    </Link>
  );
}
