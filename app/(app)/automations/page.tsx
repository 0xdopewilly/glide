"use client";

import { inputClassName } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { AUTOMATION_TEMPLATES } from "@/lib/automation-templates";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Rule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
};

type Run = {
  id: string;
  status: string;
  summary: string;
  createdAt: string;
};

type Insights = {
  completed: number;
  activeRules: number;
  recurringPayments: number;
  totalSaved: number;
};

type Approval = {
  id: string;
  amount: string;
  token: string;
  recipientLabel: string | null;
  reason: string;
};

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const cardStyle = {
  background: "var(--glide-surface-elevated)",
  borderColor: "var(--glide-elevated-border)",
} as const;

export default function AutomationsPage() {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limit, setLimit] = useState("");
  const [requireNewRecipient, setRequireNewRecipient] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const load = async () => {
    try {
      const [aRes, pRes, polRes] = await Promise.all([
        fetch("/api/automations"),
        fetch("/api/approvals"),
        fetch("/api/approvals/policy"),
      ]);
      const a = (await aRes.json()) as {
        rules?: Rule[];
        runs?: Run[];
        insights?: Insights;
      };
      const p = (await pRes.json()) as { pending?: Approval[] };
      const pol = (await polRes.json()) as {
        policy?: {
          autoApproveUnder?: string | null;
          requireForNewRecipient?: boolean;
        } | null;
      };
      setRules(a.rules ?? []);
      setRuns(a.runs ?? []);
      setInsights(a.insights ?? null);
      setApprovals(p.pending ?? []);
      setLimit(pol.policy?.autoApproveUnder ?? "");
      setRequireNewRecipient(pol.policy?.requireForNewRecipient ?? false);
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      await fetch("/api/approvals/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoApproveUnder: limit.trim() === "" ? null : limit.trim(),
          requireForNewRecipient: requireNewRecipient,
        }),
      });
      await load();
    } finally {
      setSavingPolicy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (id: string, active: boolean) => {
    setBusyId(id);
    try {
      await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    try {
      await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const activateTemplate = async (body: Record<string, unknown>, id: string) => {
    setBusyId(id);
    try {
      await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusyId(null);
    }
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
          style={cardStyle}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "var(--glide-accent)", color: "var(--glide-on-primary)" }}
          >
            <Sparkles className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-[var(--glide-text)]">
              Let your money work
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--glide-muted)]">
              Rules run automatically in the background. Ask Billy, or start from
              a template below.
            </p>
          </div>
        </div>

        {/* Insights */}
        {insights && (insights.completed > 0 || insights.activeRules > 0) ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Saved (est.)" value={`$${insights.totalSaved.toFixed(2)}`} />
            <Stat label="Automations run" value={String(insights.completed)} />
            <Stat label="Recurring payments" value={String(insights.recurringPayments)} />
            <Stat label="Active rules" value={String(insights.activeRules)} />
          </div>
        ) : null}

        {/* Pending approvals */}
        {approvals.length > 0 ? (
          <>
            <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
              Needs your approval
            </p>
            <ul className="mt-3 space-y-2">
              {approvals.map((ap) => (
                <li
                  key={ap.id}
                  className="rounded-2xl border p-4"
                  style={{
                    background: "color-mix(in srgb, #f59e0b 8%, var(--glide-surface-elevated))",
                    borderColor: "color-mix(in srgb, #f59e0b 30%, transparent)",
                  }}
                >
                  <p className="text-[15px] font-semibold text-[var(--glide-text)]">
                    Send ${ap.amount} {ap.token} to {ap.recipientLabel ?? "recipient"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--glide-muted)]">{ap.reason}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === ap.id}
                      onClick={() => void decide(ap.id, "approve")}
                      className="glide-tap flex-1 rounded-full py-2 text-[13px] font-bold disabled:opacity-50"
                      style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === ap.id}
                      onClick={() => void decide(ap.id, "reject")}
                      className="glide-tap flex-1 rounded-full py-2 text-[13px] font-bold text-red-500 disabled:opacity-50"
                      style={{ background: "color-mix(in srgb, #ef4444 14%, transparent)" }}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

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
                style={cardStyle}
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
                  disabled={busyId === r.id}
                  onClick={() => void toggle(r.id, false)}
                  className="glide-tap glide-label-mono shrink-0 rounded-full px-3 py-1 text-[11px] font-bold text-red-500 disabled:opacity-50"
                  style={{ background: "color-mix(in srgb, #ef4444 14%, transparent)" }}
                >
                  Turn off
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="mt-3 rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-[var(--glide-muted)]"
            style={{ borderColor: "var(--glide-border)" }}
          >
            {loading ? "Loading…" : "No active automations. Start from a template below."}
          </p>
        )}

        {/* Templates */}
        <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
          Start from a template
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {AUTOMATION_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busyId === t.id}
              onClick={() =>
                t.mode === "instant"
                  ? void activateTemplate(t.body, t.id)
                  : router.push(`/ask?q=${encodeURIComponent(t.prompt)}`)
              }
              className="glide-tap flex flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-transform active:scale-95 disabled:opacity-50"
              style={cardStyle}
            >
              <span className="text-xl leading-none" aria-hidden>
                {t.emoji}
              </span>
              <span className="mt-1 text-[14px] font-bold text-[var(--glide-text)]">
                {t.name}
              </span>
              <span className="text-[11px] leading-snug text-[var(--glide-muted)]">
                {t.description}
              </span>
            </button>
          ))}
        </div>

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
                  style={{ background: "var(--glide-surface-container)", borderColor: "var(--glide-border)" }}
                >
                  <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--glide-muted)]">
                    {r.name}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void toggle(r.id, true)}
                    className="glide-tap glide-label-mono shrink-0 rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-50"
                    style={{ background: "color-mix(in srgb, var(--glide-accent) 14%, transparent)", color: "var(--glide-accent)" }}
                  >
                    Resume
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {/* Permissions & approvals policy */}
        <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
          Permissions
        </p>
        <div className="mt-3 rounded-2xl border p-4" style={cardStyle}>
          <label
            htmlFor="auto-approve-limit"
            className="block text-[13px] font-semibold text-[var(--glide-text)]"
          >
            Auto-approve automations under
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[var(--glide-muted)]">$</span>
            <input
              id="auto-approve-limit"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="No limit"
              className={inputClassName}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--glide-muted)]">
            Automated payments above this ask for your approval first. Leave blank
            to auto-approve everything.
          </p>
          <label className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-[var(--glide-text)]">
              Approve payments to new recipients
            </span>
            <input
              type="checkbox"
              checked={requireNewRecipient}
              onChange={(e) => setRequireNewRecipient(e.target.checked)}
              className="h-5 w-5 accent-[var(--glide-primary)]"
            />
          </label>
          <button
            type="button"
            onClick={() => void savePolicy()}
            disabled={savingPolicy}
            className="glide-tap mt-4 w-full rounded-full py-2.5 text-[13px] font-bold disabled:opacity-50"
            style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
          >
            {savingPolicy ? "Saving…" : "Save permissions"}
          </button>
        </div>

        {/* Run history */}
        <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
          Recent activity
        </p>
        {runs.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {runs.map((run) => {
              const badge =
                run.status === "failed"
                  ? { text: "Failed", bg: "color-mix(in srgb, #ef4444 14%, transparent)", fg: "#ef4444" }
                  : run.status === "held"
                    ? { text: "Held", bg: "color-mix(in srgb, #f59e0b 16%, transparent)", fg: "#f59e0b" }
                    : { text: "Done", bg: "var(--glide-success-container)", fg: "var(--glide-success)" };
              return (
                <li
                  key={run.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5"
                  style={cardStyle}
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
                    style={{ background: badge.bg, color: badge.fg }}
                  >
                    {badge.text}
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
            Nothing has run yet. When a payment lands or a schedule fires, it shows here.
          </p>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4" style={cardStyle}>
      <p className="text-2xl font-bold tabular-nums text-[var(--glide-text)]">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-[var(--glide-muted)]">{label}</p>
    </div>
  );
}
