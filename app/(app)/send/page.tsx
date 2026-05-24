"use client";

import { AnimatedAmount } from "@/components/animated-amount";
import { FlowPage } from "@/components/flow-page";
import { NumericKeypad } from "@/components/numeric-keypad";
import { UserAvatar } from "@/components/user-avatar";
import { GlideButton } from "@/components/glide-button";
import { SendScanSheet } from "@/components/send-scan-sheet";
import { StableTokenSegment } from "@/components/stable-token-segment";
import { shortenAddress } from "@/lib/format";
import {
  currencyPrefixForToken,
  formatStableAmount,
  stableTokenFromSymbol,
  type StableToken,
} from "@/lib/currency-format";
import { tokenAmountFromBalances } from "@/lib/tokens";
import { PLACEHOLDER_GLIDE_TAG_OR_WALLET } from "@/lib/placeholders";
import {
  isValidUsername,
  isValidWalletAddress,
  normalizeUsername,
} from "@/lib/validation";
import { useWallet } from "@/context/wallet-context";
import { AtSign, Check, QrCode, User, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const { sendMoney, wallet, loading, balance, tokens, error, clearError } =
    useWallet();
  const requestCode = searchParams.get("request")?.trim() || undefined;
  const [token, setToken] = useState<StableToken>(() =>
    stableTokenFromSymbol(searchParams.get("token")),
  );
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
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
    const t = searchParams.get("token")?.trim();
    if (t) setToken(stableTokenFromSymbol(t));
  }, [searchParams]);

  const tokenBalance = useMemo(() => {
    const fromTokens = tokenAmountFromBalances(tokens, token);
    if (fromTokens > 0) return fromTokens;
    return token === "USDC" ? balance : 0;
  }, [tokens, token, balance]);

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
  const overBalance = parsed > tokenBalance;
  const canContinue =
    parsed > 0 && recipientOk && wallet != null && !overBalance;
  const amountPrefix = currencyPrefixForToken(token);

  const handlePay = async () => {
    if (!wallet || !canContinue) return;
    setSubmitting(true);
    setLocalError(null);
    clearError();
    const ok = await sendMoney(recipient.trim(), amount, {
      note: note.trim() || undefined,
      requestCode,
      token,
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
    if (overBalance) {
      return `You only have ${formatStableAmount(tokenBalance, token)}`;
    }
    if (recipientOk) return null;
    return "Use a wallet address (0x…), Glide Tag, or contact name";
  }, [
    recipient,
    resolveState,
    resolveMessage,
    recipientOk,
    overBalance,
    tokenBalance,
    token,
  ]);

  const recipientBorderClass = useMemo(() => {
    if (!recipient.trim()) {
      return recipientFocused
        ? "ring-2 ring-[var(--glide-accent)]/35"
        : "";
    }
    if (resolveState === "checking") {
      return "ring-2 ring-[var(--glide-accent)]/25";
    }
    if (recipientOk) {
      return "ring-2 ring-[var(--glide-success)]/40";
    }
    if (resolveState === "fail") {
      return "ring-2 ring-red-500/35";
    }
    return "";
  }, [recipient, recipientFocused, recipientOk, resolveState]);

  if (step === "success") {
    return (
      <FlowPage>
        <div className="slide-up-bouncy flex flex-1 flex-col items-center px-6 pt-8 text-center">
          <h1 className="glide-label-mono text-[14px] font-bold text-[var(--glide-muted)]">
            Sent
          </h1>
          <div
            className="glide-pop mt-10 flex h-28 w-28 items-center justify-center rounded-full"
            style={{ background: "var(--glide-accent)" }}
          >
            <Check
              className="h-14 w-14"
              strokeWidth={2.5}
              style={{ color: "var(--glide-bg)" }}
            />
          </div>
          <p className="glide-label-mono mt-10 text-[11px] font-semibold text-[var(--glide-muted)]">
            You paid
          </p>
          <p
            className="mt-2 text-[56px] font-bold leading-none tracking-[-0.03em]"
            style={{ color: "var(--glide-success)" }}
          >
            {formatStableAmount(parsed, token)}
          </p>
          <p className="mt-4 text-[18px] font-semibold text-[var(--glide-text)]">
            {recipientLabel}
          </p>
          {note.trim() ? (
            <p className="mt-2 text-sm text-[var(--glide-muted)]">
              &ldquo;{note.trim()}&rdquo;
            </p>
          ) : null}
          <GlideButton
            onClick={() => router.push("/")}
            className="mt-auto mb-8 max-w-sm"
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
        <div className="slide-up-bouncy flex flex-col px-5 pb-6">
          <div
            className="mt-6 rounded-2xl border p-5 text-center"
            style={{
              background: "var(--glide-surface-elevated)",
              borderColor: "var(--glide-border)",
            }}
          >
            <UserAvatar size="lg" />
            <p className="glide-label-mono mt-3 text-[11px] font-semibold text-[var(--glide-muted)]">
              Sending to
            </p>
            <p className="mt-2 text-[20px] font-bold tracking-tight text-[var(--glide-text)]">
              {recipientLabel}
            </p>
            <p className="mt-4 text-[48px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--glide-text)]">
              {amountPrefix}
              {formatAmountDisplay(amount)}
            </p>
          </div>

          <label className="glide-label-mono mt-6 block text-[11px] font-semibold text-[var(--glide-muted)]">
            Note (optional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dinner, rent, thanks"
            style={{
              background: "var(--glide-input)",
              borderColor: "var(--glide-border)",
              color: "var(--glide-text)",
            }}
            className="mt-2 w-full rounded-xl border px-4 py-3.5 text-[16px] font-medium placeholder:text-[var(--glide-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--glide-accent)]/30"
          />

          <div
            className="mt-5 flex items-center justify-between rounded-xl border px-4 py-3.5"
            style={{
              background: "var(--glide-surface-container)",
              borderColor: "var(--glide-border)",
            }}
          >
            <span className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
              From
            </span>
            <span className="text-sm font-bold text-[var(--glide-text)]">
              Glide · {token}
            </span>
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
          >
            {submitting ? "Paying…" : `Pay ${formatStableAmount(parsed, token)}`}
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
            <p className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
              Send money
            </p>
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="glide-tap glide-label-mono inline-flex items-center gap-1.5 rounded-full bg-[var(--glide-surface-container)] px-3 py-1.5 text-[11px] font-semibold text-[var(--glide-text)]"
            >
              <QrCode className="h-3.5 w-3.5" strokeWidth={2.5} />
              Scan QR
            </button>
          </div>

          <div
            className={`mt-4 rounded-2xl border p-4 transition-shadow ${recipientBorderClass}`}
            style={{
              background: "var(--glide-surface-elevated)",
              borderColor: "var(--glide-border)",
            }}
          >
            <label
              htmlFor="send-recipient"
              className="glide-label-mono block text-[11px] font-bold text-[var(--glide-muted)]"
            >
              Send to
            </label>
            <div className="relative mt-2">
              {(kind === "username" || (inputLooksLikeUsername && !kind)) ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-[var(--glide-text)]">
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
                style={{
                  background: "var(--glide-input)",
                  borderColor: "var(--glide-border)",
                  color: "var(--glide-text)",
                }}
                className={`w-full rounded-xl border py-3.5 text-center text-[16px] font-semibold tracking-tight placeholder:font-medium placeholder:text-[var(--glide-muted)] focus:outline-none ${
                  kind === "username" ? "pl-8 pr-3" : "px-3"
                } ${kind === "wallet" || isValidWalletAddress(recipient.trim()) ? "font-mono text-[14px]" : ""}`}
              />
            </div>
            <p className="mt-2.5 text-center text-[12px] leading-snug font-medium text-[var(--glide-muted)]">
              Or type a saved contact name
            </p>
            {resolveState === "checking" ? (
              <p className="mt-3 text-center text-[12px] font-medium text-[var(--glide-muted)]">
                Verifying…
              </p>
            ) : null}
            {recipientOk && kind ? (
              <div
                className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold"
                style={{ color: "var(--glide-success)" }}
              >
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

          <p
            className={`mt-3 text-center text-[13px] font-medium leading-snug transition-opacity duration-150 ${
              hint
                ? resolveState === "fail" || overBalance
                  ? "text-red-400"
                  : "text-[var(--glide-muted)]"
                : "text-[var(--glide-muted)]"
            }`}
            style={
              hint && recipientOk && !overBalance
                ? { color: "var(--glide-success)" }
                : undefined
            }
          >
            {hint ?? `Balance ${formatStableAmount(tokenBalance, token)}`}
          </p>
        </section>

        {!requestCode ? (
          <div className="mt-4 px-1">
            <StableTokenSegment value={token} onChange={setToken} />
          </div>
        ) : null}

        <div className="mt-4 flex flex-col items-center">
          <span className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
            Amount · {token}
          </span>
          <p
            key={amount}
            className="glide-pop mt-2 text-[64px] font-bold leading-none tracking-[-0.03em]"
            style={{ color: "var(--glide-text)" }}
          >
            <AnimatedAmount
              value={formatAmountDisplay(amount)}
              prefix={amountPrefix}
              prefixClassName="text-[36px] font-bold text-[var(--glide-muted)]"
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
