"use client";

import { FormField, inputClassName } from "@/components/form-field";
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

export function ScheduledTransfersCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
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
    <div className="rounded-2xl border border-neutral-200/80 p-4 dark:border-white/10">
      <p className="text-sm font-semibold tracking-tight">Scheduled sends</p>
      <p className="mt-1 text-xs glide-muted">
        Rent, allowances — runs via daily cron on the server.
      </p>
      {rows.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-[#1c1c1e]"
            >
              <span>
                ${r.amount} → {r.recipientLabel ?? r.destination} ({r.frequency})
              </span>
              <button
                type="button"
                onClick={() => void cancel(r.id)}
                className="text-xs font-semibold text-red-500"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <FormField id="sched-to" label="To (@username or 0x)" className="mt-4">
        <input
          id="sched-to"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className={inputClassName}
        />
      </FormField>
      <FormField id="sched-amt" label="Amount" className="mt-3">
        <input
          id="sched-amt"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClassName}
        />
      </FormField>
      <FormField id="sched-freq" label="Frequency" className="mt-3">
        <select
          id="sched-freq"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly")}
          className={inputClassName}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </FormField>
      <GlideButton
        type="button"
        variant="simple"
        onClick={() => void create()}
        disabled={loading}
        className="mt-4 w-full"
        uppercase={false}
      >
        Schedule send
      </GlideButton>
    </div>
  );
}
