"use client";

import dynamic from "next/dynamic";

const QrScannerView = dynamic(
  () => import("@/components/qr-scanner-view").then((m) => m.QrScannerView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center py-12">
        <div
          className="mx-auto aspect-square w-full max-w-[280px] animate-pulse rounded-2xl"
          style={{ background: "var(--glide-surface-container)" }}
        />
        <p className="glide-label-mono mt-4 text-[11px] font-bold text-[var(--glide-muted)]">
          Starting camera…
        </p>
      </div>
    ),
  },
);

export function QrScanner({ onScanned }: { onScanned?: () => void }) {
  return <QrScannerView onScanned={onScanned} />;
}
