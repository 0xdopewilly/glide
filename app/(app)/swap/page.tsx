"use client";

import {
  FormField,
  inputClassName,
} from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { FlowPage } from "@/components/flow-page";
import { useWallet } from "@/context/wallet-context";
import { ArrowDownUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const RATE = 0.92;

export default function SwapPage() {
  const router = useRouter();
  const { addLocalTransaction } = useWallet();
  const [fromAmount, setFromAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toAmount = useMemo(() => {
    const n = parseFloat(fromAmount);
    if (Number.isNaN(n) || n <= 0) return "";
    return (n * RATE).toFixed(2);
  }, [fromAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(fromAmount);
    if (Number.isNaN(n) || n <= 0) return;
    setSubmitting(true);
    addLocalTransaction({
      id: `swap-${Date.now()}`,
      title: "Swapped USDC to EURC",
      amount: `−$${n.toFixed(2)}`,
      variant: "neutral",
      meta: "Just now",
      kind: "swap",
      status: "completed",
    });
    setSubmitting(false);
    router.push("/activity");
  };

  return (
    <FlowPage title="Swap" backHref="/">
      <form onSubmit={handleSubmit} className="flex flex-col px-5 pb-8">
        <FormField id="swap-from" label="From USDC" className="mt-4">
          <input
            id="swap-from"
            type="number"
            min="0"
            step="0.01"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.00"
            className={inputClassName}
            required
          />
        </FormField>
        <div className="my-4 flex justify-center">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--glide-surface-elevated)" }}
          >
            <ArrowDownUp className="h-5 w-5 glide-muted" />
          </span>
        </div>
        <FormField id="swap-to" label="To EURC">
          <input
            id="swap-to"
            readOnly
            value={toAmount}
            placeholder="0.00"
            className={`${inputClassName} opacity-90`}
          />
        </FormField>
        <div className="mt-4 flex justify-between rounded-xl border px-4 py-3 text-sm glide-surface-card">
          <span className="glide-muted">Exchange rate</span>
          <span className="font-semibold tracking-tight">
            1 USDC ≈ {RATE} EURC
          </span>
        </div>
        <GlideButton
          type="submit"
          disabled={submitting}
          className="mt-8"
          uppercase={false}
        >
          {submitting ? "Processing" : "Confirm Swap"}
        </GlideButton>
      </form>
    </FlowPage>
  );
}
