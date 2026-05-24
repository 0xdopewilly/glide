"use client";

import { FormField, inputClassName } from "@/components/form-field";
import { PLACEHOLDER_GLIDE_TAG_OR_ADDRESS } from "@/lib/placeholders";
import {
  formatNextScheduledRun,
  scheduleFrequencyLabel,
  type ScheduleFrequency,
} from "@/lib/scheduled-transfers";
import { GlideButton } from "@/components/glide-button";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  destination: string;
  recipientLabel: string | null;
  amount: string;
  frequency: string;
  nextRunAt: string;
};

export function ScheduledTransfersCard({ className = "" }: { className?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("monthly");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/scheduled");
    const data = (await res.json()) as { scheduled?: Row[] };
    setRows(data.scheduled ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, amount, frequency }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not schedule");
      }
      setDestination("");
      setAmount("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id: string) => {
    await fetch(`/api/scheduled?id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div
      className={`rounded-3xl border p-4 ${className}`}
      style={{
        background: "var(--glide-surface-elevated)",
        borderColor: "var(--glide-border)",
      }}
    >
      <p className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
        Active
      </p>
      {rows.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm"
              style={{
                background: "var(--glide-surface-container)",
                borderColor: "var(--glide-border)",
              }}
            >
              <span className="min-w-0 leading-snug">
                <span className="text-[15px] font-bold text-[var(--glide-text)]">
                  ${r.amount}
                </span>
                <span className="text-[var(--glide-muted)]"> → </span>
                <span className="text-[15px] font-semibold text-[var(--glide-text)]">
                  {r.recipientLabel ?? r.destination}
                </span>
                <span className="mt-1 block text-[11px] text-[var(--glide-muted)]">
                  {scheduleFrequencyLabel(r.frequency)} · next{" "}
                  {formatNextScheduledRun(r.nextRunAt, r.frequency)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void cancel(r.id)}
                className="glide-tap glide-label-mono shrink-0 rounded-full px-3 py-1 text-[11px] font-bold text-red-500"
                style={{
                  background:
                    "color-mix(in srgb, #ef4444 14%, transparent)",
                }}
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="mt-3 rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-[var(--glide-muted)]"
          style={{ borderColor: "var(--glide-border)" }}
        >
          No scheduled sends yet. Add one below.
        </p>
      )}

      <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
        New schedule
      </p>
      <FormField id="sched-to" label="To (pay tag or address)" className="mt-3">
        <input
          id="sched-to"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={PLACEHOLDER_GLIDE_TAG_OR_ADDRESS}
          className={inputClassName}
        />
      </FormField>
      <FormField id="sched-amt" label="Amount (USD)" className="mt-3">
        <input
          id="sched-amt"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50"
          className={inputClassName}
        />
      </FormField>
      <FormField id="sched-freq" label="Frequency" className="mt-3">
        <select
          id="sched-freq"
          value={frequency}
          onChange={(e) =>
            setFrequency(e.target.value as ScheduleFrequency)
          }
          className={inputClassName}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="minutely">Every minute (test)</option>
        </select>
      </FormField>
      {frequency === "minutely" ? (
        <p className="mt-2 text-xs leading-relaxed glide-muted">
          For testing only. Vercel Hobby cron runs once per day — trigger runs
          yourself:{" "}
          <code className="text-[11px]">GET /api/cron/scheduled</code> with{" "}
          <code className="text-[11px]">Authorization: Bearer CRON_SECRET</code>
          .
        </p>
      ) : null}
      <GlideButton
        type="button"
        variant="simple"
        onClick={() => void create()}
        disabled={loading || !destination.trim() || !amount.trim()}
        className="mt-4 w-full"
        uppercase={false}
      >
        {loading ? "Scheduling…" : "Schedule send"}
      </GlideButton>
    </div>
  );
}
