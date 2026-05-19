"use client";

import { parseQrAddress } from "@/lib/qr";
import { isValidWalletAddress } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const REGION_ID = "glide-qr-reader";

export function QrScannerView() {
  const router = useRouter();
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [ready, setReady] = useState(false);

  const goToSend = useCallback(
    (raw: string) => {
      const address = parseQrAddress(raw);
      if (!isValidWalletAddress(address)) {
        setError("Enter a valid wallet address");
        return;
      }
      router.push(`/send?to=${encodeURIComponent(address)}`);
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const el = document.getElementById(REGION_ID);
        if (!el) {
          setError("Scanner could not start. Use paste address below.");
          return;
        }

        const scanner = new Html5Qrcode(REGION_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (cancelled) return;
            const address = parseQrAddress(decoded);
            if (!isValidWalletAddress(address)) {
              setError("QR code is not a valid wallet address");
              return;
            }
            cancelled = true;
            void scanner
              .stop()
              .catch(() => undefined)
              .finally(() => {
                router.push(`/send?to=${encodeURIComponent(address)}`);
              });
          },
          () => {
            /* no match this frame */
          },
        );

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setError("Camera access denied or unavailable. Paste an address below.");
        }
      }
    };

    const timer = window.setTimeout(() => {
      void start();
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            scanner.clear();
          });
      }
    };
  }, [router]);

  return (
    <div className="flex flex-col">
      <div
        id={REGION_ID}
        className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-black"
      />

      {error ? (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      ) : (
        <p className="mt-4 text-center text-sm glide-muted">
          {ready ? "Point your camera at a wallet QR code" : "Starting camera…"}
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
          className="glide-tap mt-3 w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
        >
          Continue to send
        </button>
      </div>
    </div>
  );
}
