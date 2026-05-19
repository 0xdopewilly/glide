"use client";

import { parseQrAddress } from "@/lib/qr";
import { isValidWalletAddress } from "@/lib/validation";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function QrScanner() {
  const router = useRouter();
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;

    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          if (!active) return;
          const address = parseQrAddress(decoded);
          if (!isValidWalletAddress(address)) {
            setError("QR code is not a valid wallet address");
            return;
          }
          active = false;
          void scanner.stop().finally(() => {
            router.push(`/send?to=${encodeURIComponent(address)}`);
          });
        },
        () => {
          /* scan tick — no match yet */
        },
      )
      .catch(() => {
        if (active) {
          setError("Camera access denied or unavailable. Paste an address below.");
        }
      });

    return () => {
      active = false;
      void scanner
        .stop()
        .catch(() => undefined)
        .finally(() => {
          scanner.clear();
          scannerRef.current = null;
        });
    };
  }, [regionId, router]);

  const goToSend = (raw: string) => {
    const address = parseQrAddress(raw);
    if (!isValidWalletAddress(address)) {
      setError("Enter a valid wallet address");
      return;
    }
    router.push(`/send?to=${encodeURIComponent(address)}`);
  };

  return (
    <div className="flex flex-col">
      <div
        id={regionId}
        className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-black"
      />

      {error ? (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      ) : (
        <p className="mt-4 text-center text-sm glide-muted">
          Point your camera at a wallet QR code
        </p>
      )}

      <div className="mt-6">
        <label
          htmlFor="manual-address"
          className="text-xs font-semibold uppercase tracking-[0.06em] glide-muted"
        >
          Or paste address
        </label>
        <input
          id="manual-address"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="0x…"
          className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm dark:border-white/10 dark:bg-[#1c1c1e]"
        />
        <button
          type="button"
          onClick={() => goToSend(manual)}
          className="mt-3 w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
        >
          Continue to send
        </button>
      </div>
    </div>
  );
}
