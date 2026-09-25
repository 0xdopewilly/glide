"use client";

import { FlowPage } from "@/components/flow-page";
import { SendScanSheet } from "@/components/send-scan-sheet";
import { SwipeToConfirm } from "@/components/swipe-to-confirm";
import { UserAvatar } from "@/components/user-avatar";
import { newIdempotencyKey, shortenAddress } from "@/lib/format";
import {
  currencyPrefixForToken,
  formatStableAmount,
  formatTokenUnits,
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
import { useBalance, useWalletActions } from "@/context/wallet-context";
import {
  AtSign,
  CalendarClock,
  ChevronDown,
  Delete,
  QrCode,
  ShieldAlert,
  StickyNote,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { BottomSheet } from "@/components/bottom-sheet";
import { CardHeroArt } from "@/components/illustrations";
import { SettingsRow } from "@/components/settings-list";
import { haptics } from "@/lib/haptics";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
const TOKEN_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** A ?token= value that is a contract address selects an unverified token. */
function addressParam(value: string | null): string | null {
  const v = value?.trim() ?? "";
  return TOKEN_ADDRESS_RE.test(v) ? v.toLowerCase() : null;
}

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { balance, tokens } = useBalance();
  const { sendMoney, wallet, loading, error, clearError } = useWalletActions();
  const requestCode = searchParams.get("request")?.trim() || undefined;
  const [token, setToken] = useState<StableToken>(() =>
    stableTokenFromSymbol(searchParams.get("token")),
  );
  // Unverified token (memes etc.), by contract address. Null = verified token.
  const [customAddress, setCustomAddress] = useState<string | null>(() =>
    addressParam(searchParams.get("token")),
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
  const [tokenSheetOpen, setTokenSheetOpen] = useState(false);
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
    const t = searchParams.get("token")?.trim();
    const linkAddress = addressParam(t ?? null);
    const linkToken = t && !linkAddress ? stableTokenFromSymbol(t) : undefined;
    if (linkAddress) setCustomAddress(linkAddress);
    else if (linkToken) {
      setToken(linkToken);
      setCustomAddress(null);
    }
    const amt = searchParams.get("amount")?.trim();
    if (amt) {
      const n = parseFloat(amt);
      // cirBTC carries 8 decimals; rounding to 2 would change the amount.
      const dp = linkToken === "cirBTC" ? 8 : 2;
      if (!Number.isNaN(n) && n > 0) setAmount(n.toFixed(dp).replace(/\.?0+$/, "") || "0");
    }
    const n = searchParams.get("note")?.trim();
    if (n) setNote(n);
  }, [searchParams]);

  // Unverified tokens the user can send: held, and not flagged as a fake or
  // spam (those stay hidden).
  const sendableCustom = useMemo(
    () =>
      tokens.filter(
        (t) => t.verified === false && !t.suspicious && t.amount > 0 && t.tokenAddress,
      ),
    [tokens],
  );
  const customToken = customAddress
    ? (sendableCustom.find((t) => t.tokenAddress === customAddress) ?? null)
    : null;
  // A linked token that isn't (yet) in the wallet must never fall back to
  // sending USDC: block until it loads, or say it isn't held.
  const customMissing = customAddress !== null && !customToken;
  const activeSymbol = customToken?.symbol ?? token;
  const customDecimals = customToken
    ? Math.min(Math.max(customToken.decimals ?? 18, 0), 18)
    : 0;

  const tokenBalance = useMemo(() => {
    if (customToken) return customToken.amount;
    const fromTokens = tokenAmountFromBalances(tokens, token);
    if (fromTokens > 0) return fromTokens;
    return token === "USDC" ? balance : 0;
  }, [customToken, tokens, token, balance]);

  // Display only (grouped: "$1,240.50"). Stored labels keep formatActive.
  const formatBalancePill = (value: number) =>
    customToken
      ? formatTokenUnits(value, customToken.symbol, Math.min(customDecimals, 6))
      : `${currencyPrefixForToken(token)}${new Intl.NumberFormat("en-US", {
          minimumFractionDigits: token === "cirBTC" ? 0 : 2,
          maximumFractionDigits: token === "cirBTC" ? 8 : 2,
        }).format(value)}`;

  const formatActive = useCallback(
    (value: number) =>
      customToken
        ? formatTokenUnits(value, customToken.symbol, customDecimals)
        : formatStableAmount(value, token),
    [customToken, customDecimals, token],
  );

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

  // cirBTC needs up to 8 decimal places; USDC/EURC are 2; an unverified
  // token uses its own decimals.
  const maxDecimals = customToken ? customDecimals : token === "cirBTC" ? 8 : 2;

  /** Normalises a typed or keypad amount: digits and one dot, at most
   * `maxDecimals` places, no redundant leading zeros, "0" when empty. */
  const applyAmount = useCallback(
    (raw: string) => {
      // strip anything that isn't a digit or dot
      let cleaned = raw.replace(/[^0-9.]/g, "");
      if (maxDecimals === 0) cleaned = cleaned.replace(/\./g, "");
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
        cleaned = `${intPart || "0"}.${decPart.slice(0, maxDecimals)}`;
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
      // keep the number readable on the keypad screen
      if (cleaned.replace(".", "").length > 15) return;
      setAmount(cleaned);
    },
    [maxDecimals],
  );

  const pressKey = useCallback(
    (key: string) => {
      haptics.light();
      if (key === "back") {
        applyAmount(amount.length > 1 ? amount.slice(0, -1) : "0");
        return;
      }
      applyAmount(amount === "0" && key !== "." ? key : amount + key);
    },
    [amount, applyAmount],
  );

  // A hardware keyboard drives the keypad too (desktop), unless a text field
  // (recipient, note) has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable]")) return;
      if (/^[0-9]$/.test(e.key)) pressKey(e.key);
      else if (e.key === "." || e.key === ",") pressKey(".");
      else if (e.key === "Backspace") pressKey("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pressKey]);

  const parsed = parseFloat(amount) || 0;
  const recipientOk = resolveState === "ok";
  const kind = resolvedMeta?.source ?? null;
  const inputLooksLikeUsername = isValidUsername(
    normalizeUsername(recipient),
  );
  const overBalance = parsed > tokenBalance;
  const canContinue =
    parsed > 0 && recipientOk && wallet != null && !overBalance && !customMissing;
  const amountPrefix = customToken ? "" : currencyPrefixForToken(token);

  // One idempotency key per intended payment: kept across retries (e.g.
  // after a timeout) so Circle can't pay twice, reset when the payment
  // details change or it succeeds.
  const payKeyRef = useRef<string | null>(null);
  useEffect(() => {
    payKeyRef.current = null;
  }, [recipient, amount, token, customAddress]);

  const handlePay = async () => {
    if (!wallet || !canContinue) return;
    setSubmitting(true);
    setLocalError(null);
    clearError();
    payKeyRef.current ??= newIdempotencyKey();
    const result = await sendMoney(recipient.trim(), amount, {
      note: note.trim() || undefined,
      requestCode: customToken ? undefined : requestCode,
      token: activeSymbol,
      tokenAddress: customToken?.tokenAddress,
      idempotencyKey: payKeyRef.current,
    });
    setSubmitting(false);
    if (result.ok) {
      payKeyRef.current = null;
      setStep("success");
    } else setLocalError(result.error);
  };

  const recipientLabel = resolvedMeta?.label ?? recipient.trim();

  const hint = useMemo(() => {
    if (!recipient.trim()) return null;
    if (resolveState === "checking") return "Checking recipient…";
    if (resolveState === "fail" && resolveMessage) return resolveMessage;
    if (overBalance) {
      return `You only have ${formatActive(tokenBalance)}`;
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
    formatActive,
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
          <CardHeroArt className="glide-pop mt-6 h-52 w-auto" />
          <p className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)]">
            You paid
          </p>
          <p
            className="mt-2 text-[56px] font-bold leading-none tracking-[-0.03em]"
            style={{ color: "var(--glide-success)" }}
          >
            {formatActive(parsed)}
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
            className="glide-tap mt-auto mb-8 w-full max-w-sm rounded-full px-6 py-4 text-[15px] font-bold"
            style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
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
            {customToken ? (
              <p className="mt-2 text-[15px] font-semibold text-[color:var(--glide-on-elevated-variant)]">
                {customToken.symbol}
              </p>
            ) : null}
          </div>

          {customToken ? (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-snug"
              style={{
                background: "color-mix(in srgb, #F59E0B 12%, transparent)",
                color: "var(--glide-text)",
              }}
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#F59E0B" }} />
              <span>
                {customToken.name || customToken.symbol} is an unverified token. glidepay
                can&apos;t tell you what it&apos;s worth. Payments can&apos;t be reversed.
              </span>
            </div>
          ) : null}

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
            className="mt-2 w-full rounded-2xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] px-4 py-3.5 text-[16px] font-medium text-[color:var(--glide-on-elevated)] placeholder:font-medium placeholder:text-[color:var(--glide-on-elevated-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--glide-primary)]/40"
          />

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-[color:var(--glide-elevated-border)] bg-[color:var(--glide-surface-elevated)] px-4 py-3.5 text-[color:var(--glide-on-elevated)]">
            <span className="glide-label-mono text-[11px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]">
              From
            </span>
            <span className="text-sm font-bold">glidepay · {activeSymbol}</span>
          </div>

          {(localError || error) ? (
            <div
              className="mt-4 rounded-2xl px-4 py-3 text-center text-sm font-medium"
              style={{
                background: "color-mix(in srgb, var(--glide-error) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--glide-error) 28%, transparent)",
                color: "var(--glide-error)",
              }}
            >
              {localError ?? error}
            </div>
          ) : null}

          <div className="mt-6">
            <SwipeToConfirm
              label="Slide to send"
              onConfirm={handlePay}
              disabled={submitting || loading}
              loading={submitting}
              successLabel="Sent!"
            />
          </div>
        </div>
      </FlowPage>
    );
  }

  const kindLabel =
    kind === "wallet"
      ? "Wallet"
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
  const hintIsError = Boolean(hint && (resolveState === "fail" || overBalance));

  return (
    <FlowPage title="Send money" backFallback="/">
      <SendScanSheet open={scanOpen} onClose={() => setScanOpen(false)} />
      {tokenSheetOpen ? (
        <BottomSheet title="Pay with" onClose={() => setTokenSheetOpen(false)}>
          {(close) => (
            <>
              {tokenOptions.map((t) => (
                <SettingsRow
                  key={t}
                  icon={Wallet}
                  title={t}
                  subtitle={`Balance ${formatStableAmount(
                    t === "USDC" && tokenAmountFromBalances(tokens, t) === 0
                      ? balance
                      : tokenAmountFromBalances(tokens, t),
                    t,
                  )}`}
                  value={customAddress === null && t === token ? "Selected" : undefined}
                  onClick={() => {
                    setToken(t);
                    setCustomAddress(null);
                    close();
                  }}
                />
              ))}
              {!requestCode
                ? sendableCustom.map((ct) => (
                    <SettingsRow
                      key={ct.tokenAddress}
                      icon={Wallet}
                      title={ct.symbol}
                      subtitle={`Unverified · ${formatTokenUnits(ct.amount, ct.symbol, 4)}`}
                      value={customAddress === ct.tokenAddress ? "Selected" : undefined}
                      onClick={() => {
                        setCustomAddress(ct.tokenAddress ?? null);
                        close();
                      }}
                    />
                  ))
                : null}
            </>
          )}
        </BottomSheet>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* TO ----------------------------------------------------------- */}
        <div
          className={`mt-1 flex shrink-0 items-center gap-2 rounded-full py-1 pl-4 pr-1 transition-shadow ${recipientBorderClass}`}
          style={{
            background: "var(--glide-surface-container-high)",
            border: "1px solid var(--glide-border)",
          }}
        >
          <label
            htmlFor="send-recipient"
            className="shrink-0 text-[14px] font-semibold text-[color:var(--glide-on-surface-variant)]"
          >
            To
          </label>
          {(kind === "username" || (inputLooksLikeUsername && !kind)) ? (
            <span className="-mr-1 shrink-0 text-[16px] font-bold text-[color:var(--glide-on-surface-variant)]">
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
            className={`min-w-0 flex-1 bg-transparent py-2 text-[15px] font-semibold tracking-tight text-[color:var(--glide-on-surface)] placeholder:font-medium placeholder:text-[color:var(--glide-on-surface-variant)] focus:outline-none ${
              kind === "wallet" || isValidWalletAddress(recipient.trim())
                ? "font-mono text-[13px]"
                : ""
            }`}
          />
          {recipientOk && kindLabel ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold"
              style={{ background: "var(--glide-success-container)", color: "var(--glide-success)" }}
            >
              <KindIcon className="h-3 w-3" strokeWidth={2.5} />
              {kindLabel}
            </span>
          ) : resolveState === "checking" ? (
            <span className="shrink-0 text-[11px] font-semibold text-[color:var(--glide-on-surface-variant)]">
              Checking…
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            aria-label="Scan QR"
            className="glide-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--glide-surface-container-high)", color: "var(--glide-on-surface)" }}
          >
            <QrCode className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        {/* AMOUNT ------------------------------------------------------- */}
        <div className="flex min-h-[150px] flex-1 flex-col items-center justify-center text-center">
          <p
            className="flex items-baseline justify-center font-bold leading-none tracking-[-0.03em] tabular-nums text-[color:var(--glide-on-surface)]"
            style={{ fontSize: amount.length > 9 ? 44 : 60 }}
            aria-live="polite"
            aria-label={`Amount ${formatActive(parsed)}`}
          >
            {amountPrefix}
            {formatAmountDisplay(amount)}
            <span className="glide-caret ml-0.5 inline-block w-[3px] self-stretch rounded-full bg-current" aria-hidden />
            {customToken ? (
              <span className="ml-2 text-[22px] font-semibold opacity-70">{customToken.symbol}</span>
            ) : null}
          </p>
          <p
            className="mt-3 text-[13px] font-semibold"
            style={{
              color: hintIsError
                ? "var(--glide-error)"
                : "var(--glide-on-surface-variant)",
            }}
          >
            {hint ??
              (customMissing
                ? loading
                  ? "Loading this token…"
                  : "You don't hold this token"
                : "Arrives in seconds")}
          </p>
          <button
            type="button"
            onClick={() => setTokenSheetOpen(true)}
            disabled={Boolean(requestCode)}
            aria-haspopup="dialog"
            className="glide-tap mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold text-[color:var(--glide-on-surface)] disabled:opacity-80"
            style={{
              background: "var(--glide-surface-container-high)",
              border: "1px solid var(--glide-border)",
            }}
          >
            {customToken ? customToken.symbol : token} · {formatBalancePill(tokenBalance)}
            {!requestCode ? <ChevronDown className="h-4 w-4 opacity-80" strokeWidth={2.5} /> : null}
          </button>
        </div>

        {/* NOTE --------------------------------------------------------- */}
        <label
          className="flex shrink-0 items-center gap-2 rounded-2xl px-4"
          style={{
            background: "var(--glide-surface-container-high)",
            border: "1px solid var(--glide-border)",
          }}
        >
          <input
            id="send-note-inline"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder="Add note"
            maxLength={140}
            aria-label="Note (optional)"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] font-medium text-[color:var(--glide-on-surface)] placeholder:text-[color:var(--glide-on-surface-variant)] focus:outline-none"
          />
          <StickyNote className="h-5 w-5 shrink-0 text-[color:var(--glide-on-surface-variant)]" strokeWidth={2} aria-hidden />
        </label>

        {/* SCHEDULE + SEND ---------------------------------------------- */}
        <div className="mt-3 flex shrink-0 items-center gap-3">
          <Link
            href="/scheduled"
            aria-label="Schedule a payment"
            className="glide-tap flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
          >
            <CalendarClock className="h-5 w-5" strokeWidth={2.25} />
          </Link>
          <button
            type="button"
            disabled={submitDisabled}
            onClick={() => setStep("review")}
            className="glide-tap h-[54px] flex-1 rounded-full px-6 text-[16px] font-bold transition-opacity"
            style={{
              background: "var(--glide-primary)",
              color: "var(--glide-on-primary)",
              opacity: submitDisabled ? 0.55 : 1,
            }}
          >
            Send
          </button>
        </div>

        {localError || error ? (
          <div
            className="mt-3 shrink-0 rounded-2xl px-4 py-3 text-center text-sm font-medium"
            style={{
              background: "color-mix(in srgb, var(--glide-error) 14%, transparent)",
              color: "var(--glide-error)",
            }}
          >
            {localError ?? error}
          </div>
        ) : null}

        {/* KEYPAD ------------------------------------------------------- */}
        <div className="mt-3 grid shrink-0 grid-cols-3 gap-2" role="group" aria-label="Keypad">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              data-key={k === "back" ? "<" : k}
              onClick={() => pressKey(k)}
              disabled={k === "." && maxDecimals === 0}
              aria-label={k === "back" ? "Delete" : k === "." ? "Decimal point" : k}
              className="glide-tap flex h-[52px] items-center justify-center rounded-2xl text-[22px] font-semibold text-[color:var(--glide-on-surface)] active:scale-95 disabled:opacity-40"
              style={{
                background: "var(--glide-surface-container)",
                border: "1px solid var(--glide-border)",
              }}
            >
              {k === "back" ? <Delete className="h-6 w-6" strokeWidth={2} /> : k}
            </button>
          ))}
        </div>
      </div>
    </FlowPage>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

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
            background: "var(--glide-primary)",
            color: "var(--glide-on-primary)",
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
