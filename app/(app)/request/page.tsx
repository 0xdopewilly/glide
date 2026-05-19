"use client";

import { FlowPage } from "@/components/flow-page";
import { GlideButton } from "@/components/glide-button";
import { NumericKeypad } from "@/components/numeric-keypad";
import { useWallet } from "@/context/wallet-context";
import { Copy, Share2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

function formatAmount(raw: string) {
  if (!raw || raw === "0") return "0";
  return raw;
}

export default function RequestPage() {
  const { profile } = useWallet();
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`
    : null;

  const createLink = async () => {
    if (parsed <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: note.trim() || undefined }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create request");
      setUrl(data.url ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!url) return;
    const label = profile.username ? `@${profile.username}` : "me";
    const text = `Pay $${parsed.toFixed(2)} to ${label} on Glide${note.trim() ? ` — ${note.trim()}` : ""}`;
    if (navigator.share) {
      await navigator.share({ title: "Glide payment request", text, url });
    } else {
      await copyLink();
    }
  };

  return (
    <FlowPage title="Request" backHref="/">
      <div className="flex flex-col px-5 pb-8">
        {!url ? (
          <>
            <p className="mt-2 text-center text-sm glide-muted">
              Request USDC from anyone on Glide
            </p>
            <p className="mt-8 text-center text-5xl font-bold tabular-nums tracking-tight">
              ${formatAmount(amount)}
            </p>
            <div className="mt-6">
              <NumericKeypad onKey={onKey} />
            </div>
            <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.1em] glide-muted">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dinner, rent…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[16px] dark:bg-white/[0.06]"
            />
            <GlideButton
              onClick={() => void createLink()}
              disabled={parsed <= 0 || loading}
              className="mt-8"
              uppercase={false}
            >
              {loading ? "Creating…" : "Create link & QR"}
            </GlideButton>
          </>
        ) : (
          <div className="mt-4 flex flex-col items-center text-center">
            {qrSrc ? (
              <div className="rounded-3xl bg-white p-4">
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
            <p className="mt-6 text-2xl font-bold">${parsed.toFixed(2)}</p>
            {note.trim() ? (
              <p className="mt-1 text-sm glide-muted">&ldquo;{note.trim()}&rdquo;</p>
            ) : null}
            <p className="mt-4 break-all rounded-xl bg-neutral-100 px-3 py-2 font-mono text-xs dark:bg-[#1c1c1e]">
              {url}
            </p>
            <div className="mt-6 flex w-full max-w-sm gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="glide-tap flex flex-1 items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => void shareLink()}
                className="glide-tap flex flex-1 items-center justify-center gap-2 rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setUrl(null);
                setAmount("0");
                setNote("");
              }}
              className="mt-6 text-sm font-medium text-violet-500"
            >
              New request
            </button>
          </div>
        )}
      </div>
    </FlowPage>
  );
}
