"use client";

import { AnimatedAmount } from "@/components/animated-amount";
import { FlowPage } from "@/components/flow-page";
import { NumericKeypad } from "@/components/numeric-keypad";
import { UserAvatar } from "@/components/user-avatar";
import { GlideButton } from "@/components/glide-button";
import { SendScanSheet } from "@/components/send-scan-sheet";
import { shortenAddress } from "@/lib/format";
import { PLACEHOLDER_GLIDE_TAG_OR_WALLET } from "@/lib/placeholders";
import {
  isValidUsername,
  isValidWalletAddress,
  normalizeUsername,
} from "@/lib/validation";
import { useWallet } from "@/context/wallet-context";
import { AtSign, Check, QrCode, User, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

type Step = "amount" | "review" | "success";

function formatAmountDisplay(raw: string) {
  if (!raw || raw === "0") return "0";
  return raw;
}

type ResolveState = "idle" | "checking" | "ok" | "fail";

type ResolvedMeta = {
  source: "wallet" | "username" | "contact";
  label: string;
};

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendMoney, wallet, loading, balance, error, clearError } = useWallet();
  const [step, setStep] = useState<Step>("amount");
  const [recipient, setRecipient] = useState(
    () => searchParams.get("to")?.trim() ?? "",
  );
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [resolveState, setResolveState] = useState<ResolveState>("idle");
  const [resolvedMeta, setResolvedMeta] = useState<ResolvedMeta | null>(null);
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(
    () => searchParams.get("scan") === "1",
  );

  useEffect(() => {
    if (searchParams.get("scan") === "1") setScanOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const to = searchParams.get("to")?.trim();
    if (to) setRecipient(to);
    const amt = searchParams.get("amount")?.trim();
    if (amt) {
      const n = parseFloat(amt);
      if (!Number.isNaN(n) && n > 0) setAmount(n.toFixed(2).replace(/\.?0+$/, "") || "0");
    }
    const n = searchParams.get("note")?.trim();
    if (n) setNote(n);
  }, [searchParams]);

  useEffect(() => {
    const t = recipient.trim();
    if (!t) {
      setResolveState("idle");
      setResolvedMeta(null);
      setResolveMessage(null);
      return;
    }

    if (isValidWalletAddress(t)) {
      setResolveState("ok");
      setResolvedMeta({
        source: "wallet",
        label: shortenAddress(t, 8),
      });
      setResolveMessage(null);
      return;
    }

    let cancelled = false;
    setResolveState("checking");
    setResolveMessage(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/recipient/resolve?q=${encodeURIComponent(t)}`,
          );
          const data = (await res.json()) as {
            resolved?: boolean;
            source?: ResolvedMeta["source"];
            label?: string;
            message?: string;
          };
          if (cancelled) return;
          if (data.resolved && data.source && data.label) {
            setResolveState("ok");
            setResolvedMeta({ source: data.source, label: data.label });
            setResolveMessage(null);
          } else {
            setResolveState("fail");
            setResolvedMeta(null);
            setResolveMessage(
              data.message ?? "Recipient not found on Glide",
            );
          }
        } catch {
          if (!cancelled) {
            setResolveState("fail");
            setResolvedMeta(null);
            setResolveMessage("Could not verify recipient");
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [recipient]);
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
  const recipientOk = resolveState === "ok";
  const kind = resolvedMeta?.source ?? null;
  const inputLooksLikeUsername = isValidUsername(
    normalizeUsername(recipient),
  );
  const overBalance = parsed > balance;
  const canContinue =
    parsed > 0 && recipientOk && wallet != null && !overBalance;

  const handlePay = async () => {
    if (!wallet || !canContinue) return;
    setSubmitting(true);
    setLocalError(null);
    clearError();
    const ok = await sendMoney(recipient.trim(), amount, {
      note: note.trim() || undefined,
      requestCode: searchParams.get("request")?.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) setStep("success");
    else setLocalError("Payment could not be completed. Try again.");
  };

  const recipientLabel = resolvedMeta?.label ?? recipient.trim();

  const hint = useMemo(() => {
    if (!recipient.trim()) return null;
    if (resolveState === "checking") return "Checking recipient…";
    if (resolveState === "fail" && resolveMessage) return resolveMessage;
    if (overBalance) return `You only have $${balance.toFixed(2)} USDC`;
    if (recipientOk) return null;
    return "Use a wallet address (0x…), Glide Tag, or contact name";
  }, [
    recipient,
    resolveState,
    resolveMessage,
    recipientOk,
    overBalance,
    balance,
  ]);

  const recipientBorderClass = useMemo(() => {
    if (!recipient.trim()) {
      return recipientFocused
        ? "border-violet-500/60 ring-2 ring-violet-500/25"
        : "border-neutral-200/90 dark:border-white/10";
    }
    if (resolveState === "checking") {
      return "border-violet-500/50 ring-2 ring-violet-500/20";
    }
    if (recipientOk) {
      return "border-emerald-500/50 ring-2 ring-emerald-500/20";
    }
    if (resolveState === "fail") {
      return "border-red-400/60 ring-2 ring-red-500/20";
    }
    return "border-neutral-200/90 dark:border-white/10";
  }, [recipient, recipientFocused, recipientOk, resolveState]);

  if (step === "success") {
    return (
      <FlowPage>
        <div className="flex flex-1 flex-col items-center px-6 pt-8 text-center font-[family-name:var(--font-jakarta)]">
          <h1 className="text-3xl font-bold tracking-tight">Sent</h1>
          <div
            className="mt-10 flex h-28 w-28 items-center justify-center rounded-full"
            style={{ background: "var(--glide-accent)" }}
          >
            <Check className="h-14 w-14 text-white" strokeWidth={2.5} />
          </div>
          <p className="mt-10 text-base font-medium glide-muted">You paid</p>
          <p
            className="mt-2 text-5xl font-bold tracking-tight"
            style={{ color: "var(--glide-success)" }}
          >
            ${parsed.toFixed(2)}
          </p>
          <p className="mt-3 text-lg font-semibold">{recipientLabel}</p>
          {note.trim() ? (
            <p className="mt-2 text-sm glide-muted">&ldquo;{note.trim()}&rdquo;</p>
          ) : null}
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
      <FlowPage title="Review" onBack={() => setStep("amount")}>
        <div className="flex flex-col px-5 pb-6 font-[family-name:var(--font-jakarta)]">
          <div className="mt-6 rounded-2xl border border-neutral-200/90 bg-white/90 p-5 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
            <UserAvatar size="lg" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-500 dark:text-violet-300">
              Sending to
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight">{recipientLabel}</p>
            <p className="mt-4 text-5xl font-bold tracking-tight tabular-nums">
              ${formatAmountDisplay(amount)}
            </p>
          </div>

          <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.1em] glide-muted">
            Note (optional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dinner, rent, thanks"
            className="mt-2 w-full rounded-xl border border-neutral-200/90 bg-neutral-50 px-4 py-3.5 text-[16px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          />

          <div className="mt-5 flex items-center justify-between rounded-xl border border-neutral-200/90 bg-neutral-50/80 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.05]">
            <span className="text-sm font-medium glide-muted">From</span>
            <span className="text-sm font-bold">Glide · USDC</span>
          </div>

          {(localError || error) && (
            <p className="mt-4 text-center text-sm font-medium text-red-400">
              {localError ?? error}
            </p>
          )}

          <GlideButton
            onClick={() => void handlePay()}
            disabled={submitting || loading}
            variant="simple"
            className="mt-6"
            uppercase={false}
          >
            {submitting ? "Paying…" : `Pay $${parsed.toFixed(2)}`}
          </GlideButton>
        </div>
      </FlowPage>
    );
  }

  return (
    <FlowPage backHref="/">
      <SendScanSheet open={scanOpen} onClose={() => setScanOpen(false)} />
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-4 font-[family-name:var(--font-jakarta)]">
        <section className="mt-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] glide-muted">
              Send money
            </p>
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="glide-tap inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-semibold tracking-tight text-violet-700 ring-1 ring-violet-200/80 dark:bg-white/10 dark:text-violet-300 dark:ring-white/10"
            >
              <QrCode className="h-3.5 w-3.5" strokeWidth={2.5} />
              Scan QR
            </button>
          </div>

          <div
            className={`glide-input-focus mt-4 rounded-2xl border bg-white/90 p-4 shadow-sm dark:bg-white/[0.06] dark:shadow-none ${recipientBorderClass}`}
          >
            <label
              htmlFor="send-recipient"
              className="block text-[11px] font-bold uppercase tracking-[0.12em] text-violet-500 dark:text-violet-300"
            >
              Send to
            </label>
            <div className="relative mt-2">
              {(kind === "username" || (inputLooksLikeUsername && !kind)) ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-violet-600 dark:text-violet-400">
                  @
                </span>
              ) : null}
              <input
                id="send-recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                onFocus={() => setRecipientFocused(true)}
                onBlur={() => setRecipientFocused(false)}
                placeholder={PLACEHOLDER_GLIDE_TAG_OR_WALLET}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full rounded-xl border border-neutral-200/80 bg-neutral-50 py-3.5 text-center text-[16px] font-semibold tracking-tight text-neutral-900 placeholder:font-medium placeholder:text-neutral-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-0 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 ${
                  kind === "username" ? "pl-8 pr-3" : "px-3"
                } ${kind === "wallet" || isValidWalletAddress(recipient.trim()) ? "font-mono text-[14px]" : ""}`}
              />
            </div>
            <p className="mt-2.5 text-center text-[12px] leading-snug font-medium text-neutral-600 dark:text-white/50">
              Or type a saved contact name
            </p>
            {resolveState === "checking" ? (
              <p className="mt-3 text-center text-[12px] font-medium text-violet-400">
                Verifying…
              </p>
            ) : null}
            {recipientOk && kind ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-emerald-500">
                {kind === "wallet" ? (
                  <Wallet className="h-3.5 w-3.5" />
                ) : kind === "username" ? (
                  <AtSign className="h-3.5 w-3.5" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
                {kind === "wallet"
                  ? "Wallet address"
                  : kind === "username"
                    ? "Glide Tag"
                    : "Contact name"}
              </div>
            ) : null}
          </div>

          <motion.p
            key={hint ?? `balance-${balance.toFixed(2)}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: MOTION_EASE }}
            className={`mt-3 text-center text-[13px] font-medium leading-snug ${
              hint
                ? resolveState === "fail" || overBalance
                  ? "text-red-400"
                  : resolveState === "checking"
                    ? "text-violet-400"
                    : "text-emerald-500/90"
                : "glide-muted"
            }`}
          >
            {hint ?? `Balance $${balance.toFixed(2)} USDC`}
          </motion.p>
        </section>

        <div className="glide-amount-display mt-6 flex flex-col items-center">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] glide-muted">
            Amount
          </span>
          <p className="mt-2 text-[56px] font-bold leading-none tracking-tight">
            <AnimatedAmount
              value={formatAmountDisplay(amount)}
              prefix="$"
              prefixClassName="text-[32px] font-bold text-neutral-400 dark:text-white/50"
            />
          </p>
        </div>

        <div className="mt-auto pt-4">
          <NumericKeypad onKey={onKey} />
          <GlideButton
            disabled={!canContinue}
            onClick={() => setStep("review")}
            variant="simple"
            className="mb-2 mt-3"
            uppercase={false}
          >
            Continue
          </GlideButton>
        </div>
      </div>
    </FlowPage>
  );
}
