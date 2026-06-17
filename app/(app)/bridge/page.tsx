"use client";

import { ChainIcon } from "@/components/chain-icon";
import { FlowPage } from "@/components/flow-page";
import { FlowProcessingOverlay } from "@/components/flow-processing-overlay";
import { FlowStepMotion } from "@/components/flow-step-motion";
import { GlideButton } from "@/components/glide-button";
import { KitSetupBanner, useCircleReady } from "@/components/kit-setup-banner";
import { SwipeToConfirm } from "@/components/swipe-to-confirm";
import { TokenIcon } from "@/components/token-icon";
import { useWallet } from "@/context/wallet-context";
import { BRIDGE_KEY_TO_CHAIN } from "@/lib/chain-meta";
import type { BridgeNetworkKey } from "@/lib/app-kit";
import { ArrowDown, Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NETWORKS: { value: BridgeNetworkKey; label: string }[] = [
  { value: "base", label: "Base" },
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
];

type Step = "form" | "success";

export default function BridgePage() {
  const router = useRouter();
  const { bridgeMoney, balance, error, clearError } = useWallet();
  const [network, setNetwork] = useState<BridgeNetworkKey>("base");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");

  const networkLabel =
    NETWORKS.find((n) => n.value === network)?.label ?? network;
  const destChainId = BRIDGE_KEY_TO_CHAIN[network];

  const parsed = parseFloat(amount) || 0;
  const { ready: circleReady } = useCircleReady("bridge");
  const overBalance = parsed > balance;
  const canSubmit = parsed > 0 && !overBalance && !submitting && circleReady;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    clearError();
    const result = await bridgeMoney(amount, network);
    setSubmitting(false);
    if (result.ok) setStep("success");
  };

  const useMax = () => {
    if (balance > 0) setAmount(balance.toFixed(2));
  };

  return (
    <FlowPage title={step === "form" ? "Bridge" : undefined} backHref="/">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <FlowProcessingOverlay
          open={submitting}
          mode="bridge"
          subtitle={`USDC → ${networkLabel}`}
          bridgeChainId={destChainId}
        />
        <FlowStepMotion stepKey={step}>
          {step === "success" ? (
            <div className="slide-up-bouncy flex flex-1 flex-col items-center px-6 pt-10 text-center">
              <div
                className="glide-pop flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: "var(--glide-accent)" }}
              >
                <Check
                  className="h-12 w-12"
                  strokeWidth={2.5}
                  style={{ color: "var(--glide-bg)" }}
                />
              </div>
              <h1 className="glide-label-mono mt-8 text-[13px] font-bold text-[var(--glide-muted)]">
                Bridge started
              </h1>
              <p className="mt-4 text-[32px] font-bold tracking-[-0.02em] text-[var(--glide-text)]">
                ${parsed.toFixed(2)}
              </p>
              <p className="glide-label-mono mt-2 text-[11px] font-semibold text-[var(--glide-muted)]">
                USDC → {networkLabel}
              </p>
              <GlideButton
                onClick={() => router.push("/activity")}
                className="mt-auto mb-8 max-w-sm"
              >
                View activity
              </GlideButton>
            </div>
          ) : (
            <div
              className="slide-up-bouncy flex flex-col pb-8"
            >
              <KitSetupBanner mode="bridge" />
              <div className="relative flex flex-col px-5">
                {/* FROM card - USDC on Arc */}
                <div
                  className="rounded-3xl border p-5"
                  style={{
                    background: "var(--glide-surface-elevated)",
                    borderColor: "var(--glide-elevated-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol="USDC" size={36} />
                      <div className="flex flex-col">
                        <span className="text-[16px] font-bold tracking-tight text-[var(--glide-text)]">
                          USDC
                        </span>
                        <span className="glide-label-mono text-[10px] font-semibold text-[var(--glide-muted)]">
                          Arc testnet
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={useMax}
                      className="glide-tap glide-label-mono rounded-full border px-3 py-1.5 text-[11px] font-bold"
                      style={{
                        background: "var(--glide-surface-container)",
                        borderColor: "var(--glide-border)",
                        color: "var(--glide-text)",
                      }}
                    >
                      Use max
                    </button>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-[28px] font-bold text-[var(--glide-muted)]">
                      $
                    </span>
                    <input
                      id="bridge-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="min-w-0 flex-1 bg-transparent text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums focus:outline-none"
                      style={{ color: "var(--glide-text)" }}
                    />
                  </div>
                  <p className="glide-label-mono mt-3 text-[11px] font-semibold text-[var(--glide-muted)]">
                    Balance ${balance.toFixed(2)}
                  </p>
                </div>

                {/* Arrow circle */}
                <div className="relative z-10 -my-3 flex justify-center">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full ring-4"
                    style={{
                      background: "var(--glide-accent)",
                      color: "var(--glide-bg)",
                      ["--tw-ring-color" as string]: "var(--glide-bg)",
                    }}
                  >
                    <ArrowDown className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                </div>

                {/* TO card - destination network */}
                <div
                  className="rounded-3xl border p-5"
                  style={{
                    background: "var(--glide-surface-elevated)",
                    borderColor: "var(--glide-elevated-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {destChainId ? <ChainIcon chainId={destChainId} /> : null}
                      <div className="relative flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-[16px] font-bold tracking-tight text-[var(--glide-text)]">
                            {networkLabel}
                          </span>
                          <ChevronDown
                            className="h-4 w-4 text-[var(--glide-muted)]"
                            strokeWidth={2.5}
                          />
                          <select
                            value={network}
                            onChange={(e) =>
                              setNetwork(e.target.value as BridgeNetworkKey)
                            }
                            aria-label="Destination network"
                            className="absolute inset-0 cursor-pointer opacity-0"
                          >
                            {NETWORKS.map((n) => (
                              <option key={n.value} value={n.value}>
                                {n.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="glide-label-mono text-[10px] font-semibold text-[var(--glide-muted)]">
                          Destination network
                        </span>
                      </div>
                    </div>
                    <span className="glide-label-mono text-[11px] font-bold text-[var(--glide-muted)]">
                      Receive
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-[28px] font-bold text-[var(--glide-muted)]">
                      $
                    </span>
                    <p
                      className="min-w-0 flex-1 text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums"
                      style={{
                        color: parsed
                          ? "var(--glide-text)"
                          : "var(--glide-muted)",
                      }}
                    >
                      {parsed ? parsed.toFixed(2) : "0.00"}
                    </p>
                  </div>
                  <p className="glide-label-mono mt-3 text-[11px] font-semibold text-[var(--glide-muted)]">
                    USDC on {networkLabel}
                  </p>
                </div>

                {overBalance ? (
                  <p className="mt-3 text-sm text-red-400">
                    Amount exceeds your balance
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-3 text-sm text-red-400">
                    {error}
                    {/(gas|fund)/i.test(error) ? (
                      <>
                        {" "}
                        <a
                          href="https://glidepay.cash/support"
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          Contact support
                        </a>
                        .
                      </>
                    ) : null}
                  </p>
                ) : null}

                <div className="mt-8">
                  <SwipeToConfirm
                    label="Slide to bridge"
                    onConfirm={handleSubmit}
                    disabled={!canSubmit}
                    loading={submitting}
                    successLabel="Bridge initiated"
                  />
                </div>
              </div>
            </div>
          )}
        </FlowStepMotion>
      </div>
    </FlowPage>
  );
}
