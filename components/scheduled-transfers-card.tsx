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
    <div className={`rounded-2xl p-4 glide-surface-card ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] glide-muted">
        Active
      </p>
      {rows.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3.5 py-3 text-sm dark:bg-black/35"
            >
              <span className="min-w-0 leading-snug">
                <span className="font-semibold">${r.amount}</span>
                <span className="glide-muted"> → </span>
                <span className="font-medium">
                  {r.recipientLabel ?? r.destination}
                </span>
                <span className="mt-0.5 block text-xs glide-muted">
                  {scheduleFrequencyLabel(r.frequency)} · next{" "}
                  {formatNextScheduledRun(r.nextRunAt, r.frequency)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void cancel(r.id)}
                className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed px-4 py-6 text-center text-sm glide-muted"
          style={{ borderColor: "var(--glide-border)" }}
        >
          No scheduled sends yet. Add one below.
        </p>
      )}

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.06em] glide-muted">
        New schedule
      </p>
      <FormField id="sched-to" label="To (Glide Tag or address)" className="mt-3">
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
          For testing only. Runs when the scheduled-send cron fires (about every
          minute on Vercel). Set <code className="text-[11px]">CRON_SECRET</code>{" "}
          in your env.
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
