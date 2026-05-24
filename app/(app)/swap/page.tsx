"use client";

import { FlowPage } from "@/components/flow-page";
import { FlowProcessingOverlay } from "@/components/flow-processing-overlay";
import { FlowStepMotion } from "@/components/flow-step-motion";
import { GlideButton } from "@/components/glide-button";
import { GlidePillButton } from "@/components/glide-pill-button";
import { KitSetupBanner, useCircleReady } from "@/components/kit-setup-banner";
import { TokenIcon } from "@/components/token-icon";
import type { StableToken } from "@/lib/currency-format";
import {
  currencyPrefixForToken,
  formatStableAmountWithCode,
} from "@/lib/currency-format";
import { tokenAmountFromBalances } from "@/lib/tokens";
import { useWallet } from "@/context/wallet-context";
import { ArrowDownUp, Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TOKENS: readonly StableToken[] = ["USDC", "EURC", "cirBTC"];
type Step = "form" | "success";

export default function SwapPage() {
  const router = useRouter();
  const { swapMoney, wallet, balance, tokens, error, clearError } = useWallet();
  const [fromToken, setFromToken] = useState<StableToken>("USDC");
  const [toToken, setToToken] = useState<StableToken>("EURC");
  const [fromAmount, setFromAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [receivedAmount, setReceivedAmount] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const fromBalance =
    fromToken === "USDC"
      ? balance
      : tokenAmountFromBalances(tokens, fromToken);
  const parsed = parseFloat(fromAmount) || 0;

  const { ready: circleReady } = useCircleReady("swap");
  const overBalance = parsed > fromBalance;
  const canSubmit =
    parsed > 0 &&
    !overBalance &&
    !submitting &&
    circleReady &&
    fromToken !== toToken;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    clearError();
    const result = await swapMoney(fromAmount, {
      tokenIn: fromToken,
      tokenOut: toToken,
    });
    setSubmitting(false);
    if (result.ok) {
      setReceivedAmount(result.receivedAmount ?? null);
      setStep("success");
    }
  };

  const useMax = () => {
    if (fromBalance > 0) {
      const str =
        fromToken === "cirBTC" ? fromBalance.toString() : fromBalance.toFixed(2);
      setFromAmount(str);
    }
  };

  // Fetch a quote whenever the inputs change. Debounced ~400ms so we don't
  // hammer Circle as the user types. Aborts in-flight requests when stale.
  useEffect(() => {
    if (!wallet || !(parsed > 0) || fromToken === toToken || overBalance) {
      setQuoteAmount(null);
      setQuoteError(null);
      setQuoting(false);
      return;
    }
    const controller = new AbortController();
    setQuoting(true);
    setQuoteError(null);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/swap/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId: wallet.id,
            amount: fromAmount,
            tokenIn: fromToken,
            tokenOut: toToken,
          }),
          signal: controller.signal,
        });
        const ct = res.headers.get("content-type") ?? "";
        const data = ct.includes("application/json")
          ? ((await res.json()) as { amountOut?: string; error?: string })
          : {};
        if (!res.ok) {
          setQuoteAmount(null);
          setQuoteError(
            data.error ??
              (res.status >= 500
                ? "Quote service error"
                : "Could not fetch quote"),
          );
          return;
        }
        setQuoteAmount(data.amountOut ?? null);
        if (!data.amountOut) {
          setQuoteError("No quote returned for this pair");
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setQuoteError("Network error fetching quote");
      } finally {
        setQuoting(false);
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [wallet, fromAmount, fromToken, toToken, parsed, overBalance]);

  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  // When the user picks a from token that equals to token, auto-shift to.
  const handleFromChange = (next: StableToken) => {
    setFromToken(next);
    if (next === toToken) {
      const fallback = TOKENS.find((t) => t !== next) ?? "USDC";
      setToToken(fallback);
    }
  };

  const handleToChange = (next: StableToken) => {
    setToToken(next);
    if (next === fromToken) {
      const fallback = TOKENS.find((t) => t !== next) ?? "USDC";
      setFromToken(fallback);
    }
  };

  return (
    <FlowPage title={step === "form" ? "Swap" : undefined} backHref="/">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <FlowProcessingOverlay open={submitting} mode="swap" />
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
                Swap complete
              </h1>
              <p className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-[var(--glide-text)]">
                {formatStableAmountWithCode(parsed, fromToken)}{" "}
                <span className="text-[var(--glide-muted)]">→</span>{" "}
                {receivedAmount
                  ? formatStableAmountWithCode(receivedAmount, toToken)
                  : toToken}
              </p>
              <GlideButton
                onClick={() => router.push("/activity")}
                className="mt-auto mb-8 max-w-sm"
              >
                View activity
              </GlideButton>
            </div>
          ) : (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="slide-up-bouncy flex flex-col pb-8"
            >
              <KitSetupBanner mode="swap" />
              <div className="relative flex flex-col px-5">
                {/* FROM card */}
                <TokenCard
                  side="from"
                  token={fromToken}
                  tokens={TOKENS}
                  onTokenChange={handleFromChange}
                  amount={fromAmount}
                  onAmountChange={setFromAmount}
                  balance={fromBalance}
                  useMax={useMax}
                />

                {/* Swap direction circle */}
                <div className="relative z-10 -my-3 flex justify-center">
                  <button
                    type="button"
                    onClick={flipTokens}
                    aria-label="Swap direction"
                    className="glide-tap flex h-12 w-12 items-center justify-center rounded-full ring-4"
                    style={{
                      background: "var(--glide-accent)",
                      color: "var(--glide-bg)",
                      ["--tw-ring-color" as string]: "var(--glide-bg)",
                    }}
                  >
                    <ArrowDownUp className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>

                {/* TO card */}
                <TokenCard
                  side="to"
                  token={toToken}
                  tokens={TOKENS}
                  onTokenChange={handleToChange}
                  amount=""
                  onAmountChange={() => undefined}
                  balance={undefined}
                  estimatedDisplay={quoteAmount}
                  estimatedLabel={
                    parsed > 0
                      ? quoting
                        ? "Fetching quote…"
                        : quoteAmount
                          ? "Estimated"
                          : (quoteError ?? "Quote unavailable")
                      : undefined
                  }
                  readOnly
                />

                {overBalance ? (
                  <p className="mt-3 text-sm text-red-400">
                    Amount exceeds your {fromToken} balance
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-3 text-sm text-red-400">{error}</p>
                ) : null}

                <GlidePillButton
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-8 w-full"
                >
                  {submitting ? "Processing" : `Confirm swap`}
                </GlidePillButton>
              </div>
            </form>
          )}
        </FlowStepMotion>
      </div>
    </FlowPage>
  );
}

function TokenCard({
  side,
  token,
  tokens,
  onTokenChange,
  amount,
  onAmountChange,
  balance,
  useMax,
  estimatedDisplay,
  estimatedLabel,
  readOnly,
}: {
  side: "from" | "to";
  token: StableToken;
  tokens: readonly StableToken[];
  onTokenChange: (t: StableToken) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  balance?: number;
  useMax?: () => void;
  estimatedDisplay?: string | null;
  estimatedLabel?: string;
  readOnly?: boolean;
}) {
  const prefix = currencyPrefixForToken(token);
  return (
    <div
      className="rounded-3xl border p-5"
      style={{
        background: "var(--glide-surface-elevated)",
        borderColor: "var(--glide-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="relative flex items-center gap-2">
          <TokenIcon symbol={token} size={36} />
          <div className="flex items-center gap-1">
            <span className="text-[16px] font-bold tracking-tight text-[var(--glide-text)]">
              {token}
            </span>
            <ChevronDown
              className="h-4 w-4 text-[var(--glide-muted)]"
              strokeWidth={2.5}
            />
          </div>
          <select
            aria-label={`${side} token`}
            value={token}
            onChange={(e) => onTokenChange(e.target.value as StableToken)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {tokens.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {useMax && balance !== undefined ? (
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
        ) : (
          <span className="glide-label-mono text-[11px] font-bold text-[var(--glide-muted)]">
            {side === "to" ? "Receive" : null}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[28px] font-bold text-[var(--glide-muted)]">
          {prefix}
        </span>
        {readOnly ? (
          <p
            className="min-w-0 flex-1 text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums"
            style={{
              color: estimatedDisplay
                ? "var(--glide-text)"
                : "var(--glide-muted)",
            }}
          >
            {estimatedDisplay
              ? formatEstimated(estimatedDisplay, token)
              : "0.00"}
          </p>
        ) : (
          <input
            type="number"
            min="0"
            step={token === "cirBTC" ? "0.00000001" : "0.01"}
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            required={side === "from"}
            className="min-w-0 flex-1 bg-transparent text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums focus:outline-none"
            style={{ color: "var(--glide-text)" }}
          />
        )}
      </div>
      <p className="glide-label-mono mt-3 text-[11px] font-semibold text-[var(--glide-muted)]">
        {balance !== undefined
          ? `Balance ${formatStableAmountWithCode(balance, token)}`
          : (estimatedLabel ?? "Estimated")}
      </p>
    </div>
  );
}

/** Format a raw on-chain output amount with token-appropriate precision. */
function formatEstimated(raw: string, token: StableToken): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (token === "cirBTC") {
    return n.toFixed(8).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  }
  return n.toFixed(2);
}
