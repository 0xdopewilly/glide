"use client";

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

/** Home-screen flagship: surfaces the automation engine. Shows active rules +
 * total auto-saved when the user has automations, or a magnetic prompt to set
 * one up. Taps through to the Automations dashboard. */
export function AutomationShowcase() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/automations");
        const data = (await res.json().catch(() => ({}))) as {
          rules?: Rule[];
          insights?: Insights;
        };
        setRules(data.rules ?? []);
        setInsights(data.insights ?? null);
      } catch {
        /* leave empty */
      }
    })();
  }, []);

  const active = rules.filter((r) => r.active);
  const hasAny = active.length > 0;
  const saved = insights?.totalSaved ?? 0;

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
        style={{ background: "var(--glide-accent)", color: "var(--glide-on-primary)" }}
      >
        <Zap className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold tracking-tight text-[var(--glide-text)]">
          {hasAny ? "Your money's working" : "Put your money on autopilot"}
        </p>
        {hasAny ? (
          <p className="mt-0.5 truncate text-xs text-[var(--glide-muted)]">
            {active.length} active
            {saved > 0 ? ` · $${saved.toFixed(2)} auto-saved` : ""} ·{" "}
            {active[0]?.name}
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
