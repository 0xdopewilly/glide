"use client";

import dynamic from "next/dynamic";

const QrScannerView = dynamic(
  () => import("@/components/qr-scanner-view").then((m) => m.QrScannerView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center py-12">
        <div className="mx-auto aspect-square w-full max-w-[280px] animate-pulse rounded-2xl bg-neutral-200 dark:bg-[#1c1c1e]" />
        <p className="mt-4 text-sm glide-muted">Starting camera…</p>
      </div>
    ),
  },
);

export function QrScanner() {
  return <QrScannerView />;
}
