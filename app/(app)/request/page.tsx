"use client";

import { FlowPage } from "@/components/flow-page";
import { FormField, inputClassName } from "@/components/form-field";
import { StableTokenSegment } from "@/components/stable-token-segment";
import { PLACEHOLDER_GLIDE_TAG } from "@/lib/placeholders";
import { GlideButton } from "@/components/glide-button";
import { NumericKeypad } from "@/components/numeric-keypad";
import { copyText } from "@/lib/clipboard";
import {
  currencyPrefixForToken,
  formatStableAmountWithCode,
  type StableToken,
} from "@/lib/currency-format";
import { useWallet } from "@/context/wallet-context";
import { Copy, Mail, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

type Mode = "person" | "link";
type Result = {
  url: string;
  amount: string;
  token?: string;
  note?: string | null;
  targetGlideTag?: string;
  targetEmail?: string;
  targetOnGlide?: boolean;
  targetLabel?: string;
};

function formatAmount(raw: string) {
  if (!raw || raw === "0") return "0";
  return raw;
}

export default function RequestPage() {
  const { profile } = useWallet();
  const [mode, setMode] = useState<Mode>("person");
  const [token, setToken] = useState<StableToken>("USDC");
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [glideTag, setGlideTag] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // cirBTC needs up to 8 decimal places; USDC/EURC are 2.
  const maxDecimals = token === "cirBTC" ? 8 : 2;
  const onKey = useCallback(
    (key: string) => {
      setAmount((prev) => {
        if (key === "back") {
          if (prev.length <= 1) return "0";
          const next = prev.slice(0, -1);
          return next === "" || next === "." ? "0" : next;
        }
        if (key === "." && prev.includes(".")) return prev;
        if (prev === "0" && key !== ".") return key;
        if (
          prev.includes(".") &&
          (prev.split(".")[1]?.length ?? 0) >= maxDecimals
        ) {
          return prev;
        }
        return prev + key;
      });
    },
    [maxDecimals],
  );

  const parsed = parseFloat(amount) || 0;
  const qrSrc = result?.url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(result.url)}`
    : null;

  const createRequest = async () => {
    if (parsed <= 0) return;
    if (mode === "person" && !glideTag.trim() && !email.trim()) {
      setError("Enter a pay tag or email");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          token,
          note: note.trim() || undefined,
          glideTag: mode === "person" ? glideTag.trim() : undefined,
          email: mode === "person" ? email.trim() : undefined,
        }),
      });
      const data = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create request");
      setResult(data);

      if (mode === "person" && data.targetEmail && !data.targetOnGlide) {
        const payLabel = formatStableAmountWithCode(data.amount, data.token ?? token);
        const mailto = `mailto:${data.targetEmail}?subject=${encodeURIComponent(`Payment request on glidepay`)}&body=${encodeURIComponent(`Please pay ${payLabel} on glidepay: ${data.url}`)}`;
        window.location.href = mailto;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!result?.url) return;
    const ok = await copyText(result.url);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!result?.url) return;
    const myTag = profile.username ? profile.username : "me";
    const text = `Pay ${formatStableAmountWithCode(result.amount, result.token ?? token)} to ${myTag} on glidepay${result.note ? `. ${result.note}` : ""}`;
    if (navigator.share) {
      await navigator.share({ title: "glidepay payment request", text, url: result.url });
    } else {
      await copyLink();
    }
  };

  return (
    <FlowPage title="Request cash" backHref="/">
      <div className="flex flex-col px-5 pb-8">
        {!result ? (
          <>
            <p className="glide-label-mono mt-1 text-center text-[11px] font-semibold text-[var(--glide-muted)]">
              Ask someone to pay you on glidepay
            </p>

            <div className="glide-m3-segment mt-4 flex rounded-full p-1">
              <button
                type="button"
                onClick={() => setMode("person")}
                className="glide-tap flex-1 rounded-full py-2 text-xs font-bold transition-colors"
                style={
                  mode === "person"
                    ? {
                        background: "var(--glide-accent)",
                        color: "var(--glide-bg)",
                      }
                    : { color: "var(--glide-muted)" }
                }
              >
                Pay tag or email
              </button>
              <button
                type="button"
                onClick={() => setMode("link")}
                className="glide-tap flex-1 rounded-full py-2 text-xs font-bold transition-colors"
                style={
                  mode === "link"
                    ? {
                        background: "var(--glide-accent)",
                        color: "var(--glide-bg)",
                      }
                    : { color: "var(--glide-muted)" }
                }
              >
                Link & QR
              </button>
            </div>

            <div className="mt-5">
              <StableTokenSegment value={token} onChange={setToken} />
            </div>

            <p
              key={amount}
              className="glide-pop mt-8 text-center text-[64px] font-bold leading-none tabular-nums tracking-[-0.03em]"
              style={{ color: "var(--glide-text)" }}
            >
              {currencyPrefixForToken(token)}
              {formatAmount(amount)}
            </p>
            <div className="mt-4">
              <NumericKeypad onKey={onKey} />
            </div>

            {mode === "person" ? (
              <div className="mt-6 space-y-4">
                <FormField id="req-tag" label="Pay tag">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium glide-muted">
                      @
                    </span>
                    <input
                      id="req-tag"
                      value={glideTag}
                      onChange={(e) =>
                        setGlideTag(e.target.value.replace(/^@+/, "").toLowerCase())
                      }
                      placeholder={PLACEHOLDER_GLIDE_TAG}
                      className={`${inputClassName} pl-9`}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={20}
                    />
                  </div>
                </FormField>
                <p className="text-center text-xs glide-muted">or</p>
                <FormField id="req-email" label="Email">
                  <input
                    id="req-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@email.com"
                    className={inputClassName}
                  />
                </FormField>
                <p className="text-xs leading-relaxed glide-muted">
                  If they are on glidepay with this email or pay tag, they get a push
                  notification. Otherwise we open your email app with the pay link.
                </p>
              </div>
            ) : (
              <p className="mt-6 text-center text-sm glide-muted">
                You will get a shareable link and QR anyone can scan to pay you.
              </p>
            )}

            <FormField id="req-note" label="Note (optional)" className="mt-4">
              <input
                id="req-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Dinner, rent…"
                className={inputClassName}
              />
            </FormField>

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            <GlideButton
              onClick={() => void createRequest()}
              disabled={parsed <= 0 || loading}
              className="mt-8"
              uppercase={false}
            >
              {loading ? "Sending request…" : mode === "person" ? "Send request" : "Create link & QR"}
            </GlideButton>
          </>
        ) : (
          <div className="slide-up-bouncy mt-4 flex flex-col items-center text-center">
            {result.targetGlideTag || result.targetEmail ? (
              <p
                className="glide-label-mono mb-4 text-[11px] font-semibold"
                style={{ color: "var(--glide-success)" }}
              >
                {result.targetOnGlide
                  ? "Request sent · push notification incoming"
                  : `Pay link ready · ${result.targetEmail}`}
              </p>
            ) : null}

            {qrSrc ? (
              <div className="rounded-3xl bg-white p-4 ring-1 ring-black/5">
                <Image
                  src={qrSrc}
                  alt="Payment request QR"
                  width={240}
                  height={240}
                  unoptimized
                  className="aspect-square h-[240px] w-[240px]"
                />
              </div>
            ) : null}
            <p
              className="mt-6 text-[28px] font-bold tracking-[-0.02em]"
              style={{ color: "var(--glide-text)" }}
            >
              {formatStableAmountWithCode(result.amount, result.token ?? token)}
            </p>
            {result.note ? (
              <p className="mt-1 text-sm text-[var(--glide-muted)]">
                &ldquo;{result.note}&rdquo;
              </p>
            ) : null}
            <p
              className="mt-4 break-all rounded-xl px-3 py-2 font-mono text-xs"
              style={{
                background: "var(--glide-surface-container)",
                color: "var(--glide-muted)",
              }}
            >
              {result.url}
            </p>
            <div className="mt-6 flex w-full max-w-sm gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="glide-tap glide-label-mono flex flex-1 items-center justify-center gap-2 rounded-full border py-3 text-[11px] font-semibold"
                style={{
                  background: "var(--glide-surface-container)",
                  borderColor: "var(--glide-border)",
                  color: "var(--glide-text)",
                }}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => void shareLink()}
                className="glide-tap glide-label-mono flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-[11px] font-semibold"
                style={{
                  background: "var(--glide-accent)",
                  color: "var(--glide-bg)",
                }}
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
            {result.targetEmail && !result.targetOnGlide ? (
              <a
                href={`mailto:${result.targetEmail}?subject=${encodeURIComponent("Payment request on glidepay")}&body=${encodeURIComponent(result.url)}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--glide-text)]"
              >
                <Mail className="h-4 w-4" />
                Email pay link
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAmount("0");
                setNote("");
                setGlideTag("");
                setEmail("");
              }}
              className="glide-label-mono mt-6 text-[11px] font-semibold text-[var(--glide-muted)] transition-opacity hover:opacity-70"
            >
              New request
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[var(--glide-muted)]">
          Need testnet USDC or EURC?{" "}
          <Link
            href="/receive"
            className="font-semibold text-[var(--glide-text)] underline"
          >
            Get testnet funds
          </Link>
        </p>
      </div>
    </FlowPage>
  );
}
