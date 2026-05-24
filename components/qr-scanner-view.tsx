"use client";

import { parseQrPayload } from "@/lib/qr";
import { isValidWalletAddress } from "@/lib/validation";
import { Camera, CameraOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const REGION_ID = "glide-qr-reader";

type ScannerStatus = "idle" | "starting" | "ready" | "error" | "unsupported";

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

/** Quietly swallow errors from html5-qrcode's stop/clear which throw on partial starts. */
async function silentStop(
  scanner: { stop: () => Promise<void>; clear: () => void } | null,
) {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    /* not started or already stopped */
  }
  try {
    scanner.clear();
  } catch {
    /* DOM may have already unmounted */
  }
}

function isCameraSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function QrScannerView() {
  const router = useRouter();
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const navigateFromQr = useCallback(
    (raw: string) => {
      const payload = parseQrPayload(raw);
      if (!payload) {
        setErrorMessage("Could not read that QR code");
        return;
      }

      if (payload.type === "request") {
        router.push(`/pay/${payload.code}`);
        return;
      }

      if (payload.type === "send") {
        if (!isValidWalletAddress(payload.to) && !payload.to.startsWith("@")) {
          setErrorMessage("Invalid pay link");
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
        setErrorMessage("Enter a valid wallet address");
        return;
      }
      router.push(buildSendUrl({ to: payload.address }));
    },
    [router],
  );

  useEffect(() => {
    cancelledRef.current = false;

    if (!isCameraSupported()) {
      setStatus("unsupported");
      return () => {
        cancelledRef.current = true;
      };
    }

    setStatus("starting");

    const start = async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelledRef.current) return;
        const Html5Qrcode = mod.Html5Qrcode;
        if (!Html5Qrcode) {
          setStatus("error");
          setErrorMessage("Scanner library failed to load.");
          return;
        }

        const el = document.getElementById(REGION_ID);
        if (!el) {
          setStatus("error");
          setErrorMessage("Scanner could not start.");
          return;
        }

        const scanner = new Html5Qrcode(REGION_ID);
        scannerRef.current = scanner;

        const box = Math.min(260, Math.floor(el.clientWidth * 0.82) || 240);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: box, height: box } },
          (decoded) => {
            if (cancelledRef.current) return;
            const payload = parseQrPayload(decoded);
            if (!payload) return;
            cancelledRef.current = true;
            void silentStop(scannerRef.current).finally(() =>
              navigateFromQr(decoded),
            );
          },
          () => {
            /* no match this frame */
          },
        );

        if (cancelledRef.current) {
          // Cleanup ran while we were awaiting start - stop immediately.
          await silentStop(scanner);
          scannerRef.current = null;
          return;
        }

        startedRef.current = true;
        setStatus("ready");
      } catch (err) {
        if (cancelledRef.current) return;
        const name = (err as Error)?.name;
        const denied =
          name === "NotAllowedError" || name === "PermissionDeniedError";
        const missing =
          name === "NotFoundError" || name === "DevicesNotFoundError";
        setStatus("error");
        setErrorMessage(
          denied
            ? "Camera permission denied. Paste an address below."
            : missing
              ? "No camera found on this device."
              : "Camera unavailable. Paste an address below.",
        );
      }
    };

    void start();

    return () => {
      cancelledRef.current = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      startedRef.current = false;
      void silentStop(scanner);
    };
  }, [navigateFromQr]);

  const cameraOff = status === "unsupported" || status === "error";

  return (
    <div className="flex flex-col">
      <div className="relative mx-auto w-full max-w-[300px]">
        {cameraOff ? (
          <div
            className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border"
            style={{
              background: "var(--glide-surface-elevated)",
              borderColor: "var(--glide-border)",
            }}
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: "var(--glide-surface-container-high)",
                color: "var(--glide-muted)",
              }}
            >
              <CameraOff className="h-6 w-6" strokeWidth={2} />
            </span>
            <p className="px-6 text-center text-[13px] font-medium text-[var(--glide-muted)]">
              {status === "unsupported"
                ? "Camera needs HTTPS or localhost. Paste an address below."
                : (errorMessage ?? "Camera unavailable.")}
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <p
        className="glide-label-mono mt-4 text-center text-[11px] font-bold"
        style={{
          color: status === "ready" ? "var(--glide-text)" : "var(--glide-muted)",
        }}
      >
        {status === "ready" ? (
          <span className="inline-flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" strokeWidth={2.5} />
            Line up the QR
          </span>
        ) : status === "starting" ? (
          "Starting camera…"
        ) : (
          "Or paste an address below"
        )}
      </p>

      <div className="mt-6">
        <label
          htmlFor="manual-address"
          className="glide-label-mono text-[11px] font-bold text-[var(--glide-muted)]"
        >
          Paste address or link
        </label>
        <input
          id="manual-address"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="0x… or glidepay link"
          className="mt-2 w-full rounded-2xl border px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--glide-accent)]/30"
          style={{
            background: "var(--glide-input)",
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        />
        <button
          type="button"
          onClick={() => navigateFromQr(manual)}
          disabled={!manual.trim()}
          className="glide-tap glide-label-mono mt-3 w-full rounded-full py-3 text-[12px] font-bold disabled:opacity-40"
          style={{
            background: "var(--glide-accent)",
            color: "var(--glide-bg)",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
