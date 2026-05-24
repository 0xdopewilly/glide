"use client";

import { parseQrPayload } from "@/lib/qr";
import { isValidWalletAddress } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const REGION_ID = "glide-qr-reader";

function buildSendUrl(payload: {
  to: string;
  amount?: string;
  note?: string;
  request?: string;
}) {
  const params = new URLSearchParams();
  params.set("to", payload.to);
  if (payload.amount) params.set("amount", payload.amount);
  if (payload.note) params.set("note", payload.note);
  if (payload.request) params.set("request", payload.request);
  return `/send?${params.toString()}`;
}

export function QrScannerView() {
  const router = useRouter();
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [ready, setReady] = useState(false);

  const navigateFromQr = useCallback(
    (raw: string) => {
      const payload = parseQrPayload(raw);
      if (!payload) {
        setError("Could not read that QR code");
        return;
      }

      if (payload.type === "request") {
        router.push(`/pay/${payload.code}`);
        return;
      }

      if (payload.type === "send") {
        if (!isValidWalletAddress(payload.to) && !payload.to.startsWith("@")) {
          setError("Invalid pay link");
          return;
        }
        router.push(
          buildSendUrl({
            to: payload.to,
            amount: payload.amount,
            note: payload.note,
          }),
        );
        return;
      }

      if (!isValidWalletAddress(payload.address)) {
        setError("Enter a valid wallet address");
        return;
      }
      router.push(buildSendUrl({ to: payload.address }));
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

        const box = Math.min(260, Math.floor(el.clientWidth * 0.82) || 240);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: box, height: box } },
          (decoded) => {
            if (cancelled) return;
            const payload = parseQrPayload(decoded);
            if (!payload) return;
            cancelled = true;
            void scanner
              .stop()
              .catch(() => undefined)
              .finally(() => navigateFromQr(decoded));
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
  }, [navigateFromQr]);

  return (
    <div className="flex flex-col">
      <div className="relative mx-auto w-full max-w-[300px]">
        <div
          id={REGION_ID}
          className="aspect-square w-full overflow-hidden rounded-3xl bg-black"
        />
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="glide-qr-frame h-[min(72vw,260px)] w-[min(72vw,260px)] max-w-[260px]" />
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      ) : (
        <p className="mt-4 text-center text-sm glide-muted">
          {ready ? "Line up the QR inside the square" : "Starting camera…"}
        </p>
      )}

      <div className="mt-6">
        <label
          htmlFor="manual-address"
          className="text-xs font-semibold uppercase tracking-[0.06em] glide-muted"
        >
          Or paste address / link
        </label>
        <input
          id="manual-address"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="0x… or glidepay link"
          className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm dark:border-white/10 dark:bg-[#1c1c1e]"
        />
        <button
          type="button"
          onClick={() => navigateFromQr(manual)}
          className="glide-tap mt-3 w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
