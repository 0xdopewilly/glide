"use client";

import { FormField, inputClassName } from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { FlowPage } from "@/components/flow-page";
import { useWallet } from "@/context/wallet-context";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NETWORKS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "base", label: "Base" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
];

type Step = "form" | "success";

export default function BridgePage() {
  const router = useRouter();
  const { bridgeMoney, balance, error, clearError } = useWallet();
  const [network, setNetwork] = useState(NETWORKS[0].value);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [localError, setLocalError] = useState<string | null>(null);

  const networkLabel =
    NETWORKS.find((n) => n.value === network)?.label ?? network;

  const parsed = parseFloat(amount) || 0;
  const overBalance = parsed > balance;
  const canSubmit = parsed > 0 && !overBalance && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setLocalError(null);
    clearError();
    const ok = await bridgeMoney(amount, network);
    setSubmitting(false);
    if (ok) setStep("success");
    else setLocalError("Bridge could not be completed.");
  };

  if (step === "success") {
    return (
      <FlowPage>
        <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: "var(--glide-accent)" }}
          >
            <Check className="h-12 w-12 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-8 text-2xl font-bold tracking-tight">Bridge started</h1>
          <p className="mt-2 text-lg glide-muted">
            ${parsed.toFixed(2)} USDC to {networkLabel}
          </p>
          <GlideButton
            onClick={() => router.push("/activity")}
            className="mt-auto mb-8 max-w-sm"
            uppercase={false}
          >
            View activity
          </GlideButton>
        </div>
      </FlowPage>
    );
  }

  return (
    <FlowPage title="Bridge" backHref="/">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col px-5 pb-8">
        <p className="mt-2 text-sm glide-muted">
          Move USDC to another network. Balance ${balance.toFixed(2)} USDC.
        </p>
        <FormField id="bridge-network" label="Destination network" className="mt-6">
          <select
            id="bridge-network"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className={inputClassName}
          >
            {NETWORKS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="bridge-amount" label="Amount" className="mt-4">
          <input
            id="bridge-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={inputClassName}
            required
          />
        </FormField>
        {overBalance ? (
          <p className="mt-3 text-sm text-red-400">Amount exceeds your balance</p>
        ) : null}
        {(localError || error) && (
          <p className="mt-3 text-sm text-red-400">{localError ?? error}</p>
        )}
        <GlideButton
          type="submit"
          disabled={!canSubmit}
          className="mt-8"
          uppercase={false}
        >
          {submitting ? "Processing" : "Confirm bridge"}
        </GlideButton>
      </form>
    </FlowPage>
  );
}
