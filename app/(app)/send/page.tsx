"use client";

import { FlowPage } from "@/components/flow-page";
import { SendScanSheet } from "@/components/send-scan-sheet";
import { UserAvatar } from "@/components/user-avatar";
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

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

const TOKENS_FULL: readonly StableToken[] = ["USDC", "EURC", "cirBTC"];

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
  const amountInputRef = useRef<HTMLInputElement | null>(null);

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
              data.message ?? "Recipient not found on glidepay",
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

  // cirBTC needs up to 8 decimal places; USDC/EURC are 2.
  const maxDecimals = token === "cirBTC" ? 8 : 2;

  const handleAmountChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // strip anything that isn't a digit or dot
      let cleaned = raw.replace(/[^0-9.]/g, "");
      // only one decimal point allowed
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned =
          cleaned.slice(0, firstDot + 1) +
          cleaned.slice(firstDot + 1).replace(/\./g, "");
      }
      // enforce decimal places
      if (cleaned.includes(".")) {
        const [intPart, decPart = ""] = cleaned.split(".");
        cleaned = `${intPart}.${decPart.slice(0, maxDecimals)}`;
      }
      // collapse to "0" when empty, but allow "0.5" / leading "0."
      if (cleaned === "") {
        setAmount("0");
        return;
      }
      // strip redundant leading zeros (but keep "0.x")
      if (/^0\d/.test(cleaned)) {
        cleaned = cleaned.replace(/^0+/, "") || "0";
      }
      setAmount(cleaned);
    },
    [maxDecimals],
  );

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
    const result = await sendMoney(recipient.trim(), amount, {
      note: note.trim() || undefined,
      requestCode,
      token,
    });
    setSubmitting(false);
    if (result.ok) setStep("success");
    else setLocalError(result.error);
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
    return "Use a wallet address (0x…), pay tag, or contact name";
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
            className="glide-pop glow-green mt-10 flex h-28 w-28 items-center justify-center rounded-full"
            style={{ background: "#4ADE80" }}
          >
            <Check
              className="h-14 w-14"
              strokeWidth={2.5}
              style={{ color: "#0A0A0A" }}
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
          <SaveContactPrompt
            recipient={recipient.trim()}
            recipientName={
              resolvedMeta?.source === "wallet" ? null : resolvedMeta?.label ?? null
            }
          />
          <button
            type="button"
            onClick={() => router.push("/")}
            className="glide-tap glow-green mt-auto mb-8 w-full max-w-sm rounded-full px-6 py-4 text-[15px] font-bold"
            style={{ background: "#4ADE80", color: "#0A0A0A" }}
          >
            Done
          </button>
        </div>
      </FlowPage>
    );
  }

  if (step === "review") {
    return (
      <FlowPage title="Review" onBack={() => setStep("amount")}>
        <div className="slide-up-bouncy flex flex-col px-5 pb-6">
          <div className="mt-6 rounded-3xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] p-6 text-center text-[color:var(--glide-on-elevated)]">
            <UserAvatar size="lg" />
            <p className="glide-label-mono mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]">
              Sending to
            </p>
            <p className="mt-2 text-[20px] font-bold tracking-tight">
              {recipientLabel}
            </p>
            <p className="mt-4 text-[48px] font-bold leading-none tracking-[-0.03em] tabular-nums">
              {amountPrefix}
              {formatAmountDisplay(amount)}
            </p>
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <label
              htmlFor="send-note"
              className="glide-label-mono block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]"
            >
              Note (optional)
            </label>
            <span
              className={`glide-label-mono text-[10px] font-semibold ${
                note.length > 130 ? "text-red-400" : "text-[color:var(--glide-on-elevated-variant)]"
              }`}
            >
              {note.length}/140
            </span>
          </div>
          <input
            id="send-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder="Dinner, rent, thanks"
            maxLength={140}
            className="mt-2 w-full rounded-2xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] px-4 py-3.5 text-[16px] font-medium text-[color:var(--glide-on-elevated)] placeholder:font-medium placeholder:text-[color:var(--glide-on-elevated-variant)] focus:outline-none focus:ring-2 focus:ring-[#4ADE80]/40"
          />

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] px-4 py-3.5 text-[color:var(--glide-on-elevated)]">
            <span className="glide-label-mono text-[11px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]">
              From
            </span>
            <span className="text-sm font-bold">glidepay · {token}</span>
          </div>

          {(localError || error) ? (
            <div
              className="mt-4 rounded-2xl px-4 py-3 text-center text-sm font-medium"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#F87171",
              }}
            >
              {localError ?? error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={submitting || loading}
            className="glide-tap glow-green mt-6 w-full rounded-full px-6 text-[15px] font-bold disabled:opacity-60"
            style={{
              background: "#4ADE80",
              color: "#0A0A0A",
              height: "56px",
              boxShadow:
                submitting || loading ? "none" : undefined,
            }}
          >
            {submitting ? "Paying…" : `Pay ${formatStableAmount(parsed, token)}`}
          </button>
        </div>
      </FlowPage>
    );
  }

  const kindLabel =
    kind === "wallet"
      ? "Wallet address"
      : kind === "username"
        ? "Pay tag"
        : kind === "contact"
          ? "Contact"
          : null;
  const KindIcon =
    kind === "wallet" ? Wallet : kind === "username" ? AtSign : User;

  const tokenOptions: readonly StableToken[] = requestCode
    ? [token]
    : TOKENS_FULL;

  const submitDisabled = !canContinue;

  return (
    <FlowPage title="Send" backFallback="/">
      <SendScanSheet open={scanOpen} onClose={() => setScanOpen(false)} />
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-6">
        {/* AMOUNT CARD --------------------------------------------------- */}
        <div className="mt-2 rounded-3xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] p-6 text-[color:var(--glide-on-elevated)]">
          <div className="flex items-start justify-between gap-3">
            <label
              htmlFor="send-amount"
              className="glide-label-mono text-[11px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]"
            >
              Amount
            </label>

            {/* Token pills */}
            <div
              className="flex items-center gap-1 rounded-full border border-[color:var(--glide-elevated-border)] p-1"
              role="tablist"
              aria-label="Token"
            >
              {tokenOptions.map((t) => {
                const active = t === token;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setToken(t)}
                    className={`glide-tap rounded-full px-3 py-1.5 text-[11px] font-bold tracking-tight transition-colors ${
                      active
                        ? "glow-green bg-[#4ADE80] text-[#0A0A0A]"
                        : "border border-[color:var(--glide-elevated-border)] bg-transparent text-[color:var(--glide-on-elevated)]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[36px] font-bold leading-none text-[color:var(--glide-on-elevated-variant)]">
              {amountPrefix}
            </span>
            <input
              ref={amountInputRef}
              id="send-amount"
              value={formatAmountDisplay(amount)}
              onChange={handleAmountChange}
              onFocus={(e) => {
                if (e.currentTarget.value === "0") {
                  // tap selects so user can overwrite the placeholder zero
                  e.currentTarget.select();
                }
              }}
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Amount"
              className="w-full min-w-0 bg-transparent text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[color:var(--glide-on-elevated)] caret-[#4ADE80] focus:outline-none"
            />
          </div>

          <p
            className={`mt-3 text-[12px] font-semibold ${
              hint && (resolveState === "fail" || overBalance)
                ? "text-[#F87171]"
                : hint && recipientOk && !overBalance
                  ? "text-[#4ADE80]"
                  : "text-[color:var(--glide-on-elevated-variant)]"
            }`}
          >
            {hint ?? `Balance ${formatStableAmount(tokenBalance, token)}`}
          </p>
        </div>

        {/* RECIPIENT FIELD ---------------------------------------------- */}
        <label
          htmlFor="send-recipient"
          className="glide-label-mono mt-6 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]"
        >
          To
        </label>
        <div
          className={`mt-2 flex items-center gap-2 rounded-2xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] px-3 py-2 text-[color:var(--glide-on-elevated)] transition-all ${recipientBorderClass}`}
        >
          {(kind === "username" || (inputLooksLikeUsername && !kind)) ? (
            <span className="shrink-0 pl-1 text-[18px] font-bold text-[color:var(--glide-on-elevated-variant)]">
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
            aria-label="Recipient"
            className={`min-w-0 flex-1 bg-transparent py-2 text-[15px] font-semibold tracking-tight text-[color:var(--glide-on-elevated)] placeholder:font-medium placeholder:text-[color:var(--glide-on-elevated-variant)] focus:outline-none ${
              kind === "wallet" || isValidWalletAddress(recipient.trim())
                ? "font-mono text-[13px]"
                : ""
            }`}
          />
          {recipientOk && kindLabel ? (
            <span
              className="glide-label-mono inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
              style={{
                background: "rgba(74,222,128,0.18)",
                color: "#4ADE80",
              }}
            >
              <KindIcon className="h-3 w-3" strokeWidth={2.5} />
              {kindLabel}
            </span>
          ) : resolveState === "checking" ? (
            <span className="glide-label-mono shrink-0 text-[10px] font-bold text-[color:var(--glide-on-elevated-variant)]">
              Checking…
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            aria-label="Scan QR"
            className="glide-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--glide-elevated-border)] text-[color:var(--glide-on-elevated)]"
          >
            <QrCode className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        {/* NOTE FIELD --------------------------------------------------- */}
        <div className="mt-5 flex items-baseline justify-between">
          <label
            htmlFor="send-note-inline"
            className="glide-label-mono block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]"
          >
            Note (optional)
          </label>
          <span
            className={`glide-label-mono text-[10px] font-semibold ${
              note.length > 130 ? "text-[#F87171]" : "text-[color:var(--glide-on-elevated-variant)]"
            }`}
          >
            {note.length}/140
          </span>
        </div>
        <input
          id="send-note-inline"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 140))}
          placeholder="Dinner, rent, thanks"
          maxLength={140}
          className="mt-2 w-full rounded-2xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] px-4 py-3.5 text-[16px] font-medium text-[color:var(--glide-on-elevated)] placeholder:font-medium placeholder:text-[color:var(--glide-on-elevated-variant)] focus:outline-none focus:ring-2 focus:ring-[#4ADE80]/40"
        />

        {/* SUBMIT ------------------------------------------------------- */}
        <div className="mt-auto pt-6">
          <button
            type="button"
            disabled={submitDisabled}
            onClick={() => setStep("review")}
            className={`glide-tap w-full rounded-full px-6 text-[15px] font-bold transition-opacity ${
              submitDisabled ? "" : "glow-green"
            }`}
            style={{
              background: "#4ADE80",
              color: "#0A0A0A",
              height: "56px",
              opacity: submitDisabled ? 0.45 : 1,
              boxShadow: submitDisabled ? "none" : undefined,
            }}
          >
            {`Send ${token}`}
          </button>

          {localError || error ? (
            <div
              className="mt-3 rounded-2xl px-4 py-3 text-center text-sm font-medium"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#F87171",
              }}
            >
              {localError ?? error}
            </div>
          ) : null}
        </div>
      </div>
    </FlowPage>
  );
}

/** Renders an inline "Save {name} to contacts?" card on the success screen
 * after a real wallet-address send. Mirrors what Billy offers in chat so the
 * /send flow doesn't feel less helpful than the assistant flow. */
function SaveContactPrompt({
  recipient,
  recipientName,
}: {
  recipient: string;
  recipientName: string | null;
}) {
  const [status, setStatus] = useState<"prompt" | "saving" | "saved" | "skip">(
    "prompt",
  );
  const [exists, setExists] = useState<boolean | null>(null);
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient);

  useEffect(() => {
    if (!isAddress) {
      setExists(true);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      wallet: recipient,
      name: recipientName ?? "Contact",
    });
    fetch(`/api/contacts/exists?${params}`)
      .then((r) => r.json())
      .then((data: { exists?: boolean }) => {
        if (!cancelled) setExists(!!data.exists);
      })
      .catch(() => {
        if (!cancelled) setExists(true);
      });
    return () => {
      cancelled = true;
    };
  }, [recipient, recipientName, isAddress]);

  if (!isAddress || exists === null || exists || status === "skip") return null;

  if (status === "saved") {
    return (
      <p className="mt-6 glide-label-mono text-[11px] font-semibold text-[var(--glide-success)]">
        Saved to contacts.
      </p>
    );
  }

  const handleSave = async () => {
    const name = window.prompt("Name this contact", recipientName ?? "");
    if (!name?.trim()) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), walletAddress: recipient }),
      });
      setStatus(res.ok ? "saved" : "prompt");
    } catch {
      setStatus("prompt");
    }
  };

  return (
    <div
      className="mt-6 w-full max-w-sm rounded-2xl border px-4 py-4 text-left"
      style={{
        background: "var(--glide-surface-elevated)",
        borderColor: "var(--glide-elevated-border)",
      }}
    >
      <p className="text-[14px] font-semibold text-[var(--glide-text)]">
        Save this address to contacts?
      </p>
      <p className="mt-1 font-mono text-[11px] text-[var(--glide-muted)]">
        {shortenAddress(recipient)}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={status === "saving"}
          className="glide-tap glide-label-mono flex-1 rounded-full py-2.5 text-[11px] font-bold disabled:opacity-50"
          style={{
            background: "#4ADE80",
            color: "#0A0A0A",
          }}
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setStatus("skip")}
          className="glide-tap glide-label-mono flex-1 rounded-full border py-2.5 text-[11px] font-bold"
          style={{
            background: "var(--glide-surface-container)",
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
