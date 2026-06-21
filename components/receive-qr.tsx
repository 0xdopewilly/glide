"use client";

import { Download, Share2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

function qrUrl(address: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=24&data=${encodeURIComponent(address)}`;
}

async function fetchQrBlob(address: string): Promise<Blob | null> {
  try {
    const res = await fetch(qrUrl(address));
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export function ReceiveQr({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!address) return null;

  const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(address)}`;

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2000);
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await fetchQrBlob(address);
      if (!blob) {
        flash("Could not download");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `glidepay-qr-${address.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash("Saved");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await fetchQrBlob(address);
      if (!blob) {
        flash("Could not share");
        return;
      }
      const file = new File([blob], "glidepay-qr.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: "Pay me on glidepay",
            text: `Pay me on glidepay: ${address}`,
            files: [file],
          } as ShareData);
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }
      // No native file share: open the PNG in a new tab so user can save.
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-8 w-[min(100%,300px)]">
      <div
        className="overflow-hidden rounded-2xl border p-3"
        style={{
          borderColor: "var(--glide-border)",
          background: "#ffffff",
        }}
      >
        <Image
          src={src}
          alt="QR code for your wallet address"
          width={220}
          height={220}
          className="h-auto w-full"
          unoptimized
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={busy}
          className="glide-tap glide-label-mono flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[11px] font-bold disabled:opacity-50"
          style={{
            background: "var(--glide-accent)",
            color: "var(--glide-on-primary)",
          }}
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
          Share QR
        </button>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={busy}
          className="glide-tap glide-label-mono flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-[11px] font-bold disabled:opacity-50"
          style={{
            background: "var(--glide-surface-container)",
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
          Save QR
        </button>
      </div>
      {feedback ? (
        <p
          className="glide-label-mono mt-2 text-center text-[10px] font-bold"
          style={{ color: "var(--glide-success)" }}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
