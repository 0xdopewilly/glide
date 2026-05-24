"use client";

import type { GlideTransaction } from "@/lib/types";
import { Copy, Download, ExternalLink, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortHash(h?: string) {
  if (!h) return "";
  return h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderReceiptCanvas(opts: {
  title: string;
  amount: string;
  recipient: string;
  date: string;
  txHash?: string;
}): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background — solid navy with subtle gradient sheen
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0e1a3a");
  grad.addColorStop(1, "#06112c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Card inset
  const cardX = 80;
  const cardY = 100;
  const cardW = W - cardX * 2;
  const cardH = H - cardY * 2;
  const r = 56;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  // rounded rect
  ctx.beginPath();
  ctx.moveTo(cardX + r, cardY);
  ctx.lineTo(cardX + cardW - r, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
  ctx.lineTo(cardX + cardW, cardY + cardH - r);
  ctx.quadraticCurveTo(
    cardX + cardW,
    cardY + cardH,
    cardX + cardW - r,
    cardY + cardH,
  );
  ctx.lineTo(cardX + r, cardY + cardH);
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
  ctx.lineTo(cardX, cardY + r);
  ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Logo (white wordmark on navy bg)
  try {
    const logo = await loadImage("/glidepay-wordmark.png");
    const logoW = 480;
    const ratio = logo.height / logo.width;
    const logoH = logoW * ratio;
    ctx.drawImage(logo, (W - logoW) / 2, cardY + 90, logoW, logoH);
  } catch {
    /* logo failed to load — skip */
  }

  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Label
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 30px ui-monospace, Menlo, monospace";
  const labelText = opts.title.toUpperCase();
  // letterspacing trick
  const spaced = labelText.split("").join("  ");
  ctx.fillText(spaced, cx, cardY + 340);

  // Amount
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 156px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(opts.amount, cx, cardY + 510);

  // Recipient
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 38px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(opts.recipient, cx, cardY + 580);

  // Date
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "500 26px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(opts.date, cx, cardY + 670);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 80, cardY + 760);
  ctx.lineTo(cardX + cardW - 80, cardY + 760);
  ctx.stroke();

  // Hash
  if (opts.txHash) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "700 18px ui-monospace, Menlo, monospace";
    ctx.fillText("TRANSACTION HASH", cx, cardY + 820);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 26px ui-monospace, Menlo, monospace";
    ctx.fillText(shortHash(opts.txHash), cx, cardY + 870);
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "700 22px ui-monospace, Menlo, monospace";
  ctx.fillText("GLIDEPAY  ·  ARC  TESTNET", cx, cardY + cardH - 80);

  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
}

export function TransactionReceiptSheet({
  tx,
  open,
  onClose,
}: {
  tx: GlideTransaction | null;
  open: boolean;
  onClose: () => void;
}) {
  const previewRef = useRef<HTMLImageElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const opts = tx
    ? {
        title:
          tx.variant === "credit"
            ? tx.kind === "swap"
              ? "Received"
              : "Payment received"
            : tx.kind === "swap"
              ? "Swap complete"
              : tx.kind === "bridge"
                ? "Bridge started"
                : "Payment sent",
        amount: (tx.amount || "").replace(/^[−-]/, ""),
        recipient: tx.meta || tx.title || "",
        date: formatDate(tx.createdAt),
        txHash: tx.txHash ?? undefined,
      }
    : null;

  const buildCanvas = useCallback(async () => {
    if (!opts) return null;
    return renderReceiptCanvas(opts);
  }, [opts]);

  // Generate preview when sheet opens
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (open && opts) {
      void (async () => {
        const canvas = await buildCanvas();
        if (cancelled || !canvas) return;
        const blob = await canvasToBlob(canvas);
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })();
    } else {
      setPreviewUrl(null);
      setFeedback(null);
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, buildCanvas, opts]);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2000);
  };

  const handleSave = async () => {
    if (!opts) return;
    setBusy(true);
    try {
      const canvas = await buildCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `glidepay-receipt-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash("Saved");
    } finally {
      setBusy(false);
    }
  };

  const handleShareImage = async () => {
    if (!opts) return;
    setBusy(true);
    try {
      const canvas = await buildCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      if (!blob) return;
      const file = new File([blob], "glidepay-receipt.png", {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: "glidepay receipt",
            files: [file],
          } as ShareData);
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }
      // Fallback: open preview in a new tab so user can save manually
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyHash = async () => {
    if (!tx?.txHash) return;
    try {
      await navigator.clipboard.writeText(tx.txHash);
      flash("Hash copied");
    } catch {
      flash("Could not copy");
    }
  };

  if (!open || !tx) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label="Close receipt"
        className="absolute inset-0"
        style={{
          background: "color-mix(in srgb, var(--glide-bg) 82%, transparent)",
        }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transaction receipt"
        className="slide-up-bouncy relative mt-auto flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-x"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 pb-3 pt-4"
          style={{ borderColor: "var(--glide-border)" }}
        >
          <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
            Receipt
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="glide-tap flex h-9 w-9 items-center justify-center rounded-full border"
            style={{
              background: "var(--glide-surface-container)",
              borderColor: "var(--glide-border)",
              color: "var(--glide-text)",
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {/* Receipt preview */}
          <div
            className="overflow-hidden rounded-3xl"
            style={{ aspectRatio: "1080 / 1350" }}
          >
            {previewUrl ? (
              <img
                ref={previewRef}
                src={previewUrl}
                alt="Receipt preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full animate-pulse"
                style={{ background: "var(--glide-surface-container)" }}
              />
            )}
          </div>

          {feedback ? (
            <p
              className="glide-label-mono mt-3 text-center text-[11px] font-bold"
              style={{ color: "var(--glide-success)" }}
            >
              {feedback}
            </p>
          ) : null}

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleShareImage()}
              disabled={busy}
              className="glide-tap glide-label-mono flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[12px] font-bold disabled:opacity-50"
              style={{
                background: "var(--glide-accent)",
                color: "var(--glide-bg)",
              }}
            >
              <Share2 className="h-4 w-4" strokeWidth={2.5} />
              Share
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="glide-tap glide-label-mono flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-[12px] font-bold disabled:opacity-50"
              style={{
                background: "var(--glide-surface-container)",
                borderColor: "var(--glide-border)",
                color: "var(--glide-text)",
              }}
            >
              <Download className="h-4 w-4" strokeWidth={2.5} />
              Save image
            </button>
          </div>

          {(tx.txHash || tx.explorerUrl) ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {tx.txHash ? (
                <button
                  type="button"
                  onClick={() => void handleCopyHash()}
                  className="glide-tap glide-label-mono flex items-center justify-center gap-2 rounded-2xl border py-3 text-[11px] font-bold"
                  style={{
                    background: "var(--glide-surface-container)",
                    borderColor: "var(--glide-border)",
                    color: "var(--glide-text)",
                  }}
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Copy hash
                </button>
              ) : null}
              {tx.explorerUrl ? (
                <a
                  href={tx.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glide-tap glide-label-mono flex items-center justify-center gap-2 rounded-2xl border py-3 text-[11px] font-bold"
                  style={{
                    background: "var(--glide-surface-container)",
                    borderColor: "var(--glide-border)",
                    color: "var(--glide-text)",
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Explorer
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
