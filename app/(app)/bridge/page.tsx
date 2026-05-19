"use client";

import { FormField, inputClassName } from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { GlidePillButton } from "@/components/glide-pill-button";
import { FlowPage } from "@/components/flow-page";
import { FlowProcessingOverlay } from "@/components/flow-processing-overlay";
import { FlowStepMotion } from "@/components/flow-step-motion";
import { KitSetupBanner, useCircleReady } from "@/components/kit-setup-banner";
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

  const networkLabel =
    NETWORKS.find((n) => n.value === network)?.label ?? network;

  const parsed = parseFloat(amount) || 0;
  const { ready: circleReady } = useCircleReady("bridge");
  const overBalance = parsed > balance;
  const canSubmit = parsed > 0 && !overBalance && !submitting && circleReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    clearError();
    const ok = await bridgeMoney(amount, network);
    setSubmitting(false);
    if (ok) setStep("success");
  };

  return (
    <FlowPage title={step === "form" ? "Bridge" : undefined} backHref="/">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <FlowProcessingOverlay open={submitting} mode="bridge" />
        <FlowStepMotion stepKey={step}>
        {step === "success" ? (
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
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col pb-8">
            <KitSetupBanner mode="bridge" />
            <div className="flex flex-col px-5">
              <FormField id="bridge-network" label="Destination network" className="mt-2">
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
              {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
              <GlidePillButton
                type="submit"
                disabled={!canSubmit}
                className="mt-8 w-full justify-center py-3.5"
              >
                {submitting ? "Processing" : "Confirm bridge"}
              </GlidePillButton>
            </div>
          </form>
        )}
        </FlowStepMotion>
      </div>
    </FlowPage>
  );
}
