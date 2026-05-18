"use client";

import { AnimatedAmount } from "@/components/animated-amount";
import { FlowPage } from "@/components/flow-page";
import { NumericKeypad } from "@/components/numeric-keypad";
import { UserAvatar } from "@/components/user-avatar";
import { GlideButton } from "@/components/glide-button";
import { shortenAddress } from "@/lib/format";
import { isValidWalletAddress } from "@/lib/validation";
import { useWallet } from "@/context/wallet-context";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type Step = "amount" | "review" | "success";

function formatAmountDisplay(raw: string) {
  if (!raw || raw === "0") return "0";
  return raw;
}

export default function SendPage() {
  const router = useRouter();
  const { sendMoney, wallet, loading, balance, error, clearError } = useWallet();
  const [step, setStep] = useState<Step>("amount");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onKey = useCallback((key: string) => {
    setAmount((prev) => {
      if (key === "back") {
        if (prev.length <= 1) return "0";
        const next = prev.slice(0, -1);
        return next === "" || next === "." ? "0" : next;
      }
      if (key === "." && prev.includes(".")) return prev;
      if (prev === "0" && key !== ".") return key;
      if (prev.includes(".") && prev.split(".")[1]?.length >= 2) return prev;
      return prev + key;
    });
  }, []);

  const parsed = parseFloat(amount) || 0;
  const addressOk = isValidWalletAddress(recipient);
  const overBalance = parsed > balance;
  const canContinue =
    parsed > 0 && addressOk && wallet != null && !overBalance;

  const handlePay = async () => {
    if (!wallet || !canContinue) return;
    setSubmitting(true);
    setLocalError(null);
    clearError();
    const ok = await sendMoney(recipient.trim(), amount);
    setSubmitting(false);
    if (ok) setStep("success");
    else setLocalError("Payment could not be completed. Try again.");
  };

  const hint = useMemo(() => {
    if (!recipient.trim()) return null;
    if (!addressOk) return "Enter a valid wallet address";
    if (overBalance) return `You only have $${balance.toFixed(2)} USDC`;
    return null;
  }, [recipient, addressOk, overBalance, balance]);

  if (step === "success") {
    return (
      <FlowPage>
        <div className="flex flex-1 flex-col items-center px-6 pt-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Sent</h1>
          <div
            className="mt-10 flex h-28 w-28 items-center justify-center rounded-full"
            style={{ background: "var(--glide-accent)" }}
          >
            <Check className="h-14 w-14 text-white" strokeWidth={2.5} />
          </div>
          <p className="mt-10 text-lg glide-muted">You paid</p>
          <p
            className="mt-2 text-4xl font-semibold tracking-tight"
            style={{ color: "var(--glide-success)" }}
          >
            ${parsed.toFixed(2)}
          </p>
          <p className="mt-3 text-lg font-medium">
            {shortenAddress(recipient, 6)}
          </p>
          <GlideButton
            onClick={() => router.push("/")}
            className="mt-auto mb-8 max-w-sm"
            uppercase={false}
          >
            Done
          </GlideButton>
        </div>
      </FlowPage>
    );
  }

  if (step === "review") {
    return (
      <FlowPage title="Pay" onBack={() => setStep("amount")}>
        <div className="flex flex-col px-5 pb-6">
          <div className="mt-6 flex flex-col items-center text-center">
            <UserAvatar size="lg" />
            <p className="mt-3 font-mono text-sm glide-muted">
              {shortenAddress(recipient, 8)}
            </p>
            <p className="mt-4 text-4xl font-normal tracking-tight">
              ${formatAmountDisplay(amount)}
            </p>
          </div>

          <label className="mt-8 block text-sm font-medium glide-muted">
            What&apos;s it for?
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dinner, rent, thanks"
            className="mt-2 w-full border-0 border-b bg-transparent py-3 text-[17px] focus:outline-none glide-input"
          />

          <div className="mt-8 flex items-center justify-between rounded-xl border px-4 py-3 glide-surface-card">
            <span className="text-sm glide-muted">Transfer from</span>
            <span className="text-sm font-semibold">Glide USDC</span>
          </div>

          {(localError || error) && (
            <p className="mt-4 text-sm text-red-400">{localError ?? error}</p>
          )}

          <GlideButton
            onClick={() => void handlePay()}
            disabled={submitting || loading}
            className="mt-6"
            uppercase={false}
          >
            {submitting ? "Paying" : `Pay $${parsed.toFixed(2)}`}
          </GlideButton>
        </div>
      </FlowPage>
    );
  }

  return (
    <FlowPage backHref="/">
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <div className="mt-4 flex flex-col items-center">
          <UserAvatar size="lg" />
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient wallet address"
            className="mt-4 w-full max-w-xs border-0 bg-transparent text-center text-sm font-mono focus:outline-none"
            style={{ color: "var(--glide-text)" }}
          />
          {hint ? (
            <p className="mt-2 text-center text-xs text-red-400">{hint}</p>
          ) : (
            <p className="mt-2 text-center text-xs glide-muted">
              Balance ${balance.toFixed(2)} USDC
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-5xl font-normal tracking-tight">
          <AnimatedAmount value={formatAmountDisplay(amount)} />
        </p>

        <div className="mt-auto">
          <NumericKeypad onKey={onKey} />
          <GlideButton
            disabled={!canContinue}
            onClick={() => setStep("review")}
            className="mb-2 mt-2"
            uppercase={false}
          >
            Continue
          </GlideButton>
        </div>
      </div>
    </FlowPage>
  );
}
