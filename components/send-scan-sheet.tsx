"use client";

import { QrScanner } from "@/components/qr-scanner";
import { X } from "lucide-react";

export function SendScanSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label="Close scanner"
        className="absolute inset-0"
        style={{
          background: "color-mix(in srgb, var(--glide-bg) 78%, transparent)",
        }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan QR code"
        className="slide-up-bouncy relative mt-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-x"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-border)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--glide-border)" }}
        >
          <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
            Scan to pay
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
        <div className="overflow-y-auto px-5 pb-8 pt-4">
          <QrScanner onScanned={onClose} />
        </div>
      </div>
    </div>
  );
}
