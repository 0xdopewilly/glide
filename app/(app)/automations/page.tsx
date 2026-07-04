"use client";

import { PageHeader } from "@/components/page-header";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Rule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  percent: number | null;
  token: string;
  active: boolean;
};

type Run = {
  id: string;
  status: string;
  summary: string;
  amountLabel: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/automations");
      const data = (await res.json()) as { rules?: Rule[]; runs?: Run[] };
      setRules(data.rules ?? []);
      setRuns(data.runs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (id: string, active: boolean) => {
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await load();
  };

  const activeRules = rules.filter((r) => r.active);
  const pausedRules = rules.filter((r) => !r.active);

  return (
    <>
      <PageHeader title="Automations" backHref="/payments" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        {/* Intro */}
        <div
          className="slide-up-bouncy mt-2 flex items-start gap-3 rounded-3xl border p-4"
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
            <Sparkles className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-[var(--glide-text)]">
              Let your money work
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--glide-muted)]">
              Rules run automatically in the background. Ask Billy something like
              “save 10% of every payment I get.”
            </p>
          </div>
        </div>

        {/* Active rules */}
        <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
          Active
        </p>
        {activeRules.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {activeRules.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5"
                style={{
                  background: "var(--glide-surface-elevated)",
                  borderColor: "var(--glide-elevated-border)",
                }}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: "var(--glide-success)" }}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--glide-text)]">
                    {r.name}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void toggle(r.id, false)}
                  className="glide-tap glide-label-mono shrink-0 rounded-full px-3 py-1 text-[11px] font-bold text-red-500"
                  style={{
                    background: "color-mix(in srgb, #ef4444 14%, transparent)",
                  }}
                >
                  Turn off
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Link
            href="/ask"
            prefetch
            className="glide-tap mt-3 block rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-[var(--glide-muted)] transition-colors"
            style={{ borderColor: "var(--glide-border)" }}
          >
            {loading
              ? "Loading…"
              : "No automations yet. Tap to ask Billy: “Save 10% of every payment.”"}
          </Link>
        )}

        {/* Paused rules */}
        {pausedRules.length > 0 ? (
          <>
            <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
              Paused
            </p>
            <ul className="mt-3 space-y-2">
              {pausedRules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5"
                  style={{
                    background: "var(--glide-surface-container)",
                    borderColor: "var(--glide-border)",
                  }}
                >
                  <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--glide-muted)]">
                    {r.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggle(r.id, true)}
                    className="glide-tap glide-label-mono shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{
                      background: "color-mix(in srgb, var(--glide-accent) 14%, transparent)",
                      color: "var(--glide-accent)",
                    }}
                  >
                    Resume
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {/* Run history — the story of how money moved */}
        <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
          Recent activity
        </p>
        {runs.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {runs.map((run) => {
              const failed = run.status === "failed";
              return (
                <li
                  key={run.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5"
                  style={{
                    background: "var(--glide-surface-elevated)",
                    borderColor: "var(--glide-elevated-border)",
                  }}
                >
                  <span className="min-w-0 leading-snug">
                    <span className="text-sm font-medium text-[var(--glide-text)]">
                      {run.summary}
                    </span>
                    <span className="mt-1 block text-[11px] text-[var(--glide-muted)]">
                      {timeAgo(run.createdAt)}
                    </span>
                  </span>
                  <span
                    className="glide-label-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{
                      background: failed
                        ? "color-mix(in srgb, #ef4444 14%, transparent)"
                        : "var(--glide-success-container)",
                      color: failed ? "#ef4444" : "var(--glide-success)",
                    }}
                  >
                    {failed ? "Failed" : "Saved"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p
            className="mt-3 rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-[var(--glide-muted)]"
            style={{ borderColor: "var(--glide-border)" }}
          >
            Nothing has run yet. When a payment lands, your rules act on it here.
          </p>
        )}
      </div>
    </>
  );
}
