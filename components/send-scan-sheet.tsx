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
        className="glide-sheet-backdrop absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan QR code"
        className="glide-sheet-panel relative mt-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-[#141416]"
      >
        <div className="flex items-center justify-between border-b px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-semibold tracking-tight">Scan to pay</h2>
          <button
            type="button"
            onClick={onClose}
            className="glide-tap flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-[#1c1c1e]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-8 pt-4">
          <QrScanner />
        </div>
      </div>
    </div>
  );
}
