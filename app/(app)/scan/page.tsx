"use client";

import { PageHeader } from "@/components/page-header";
import { QrScanner } from "@/components/qr-scanner";

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Scan" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <QrScanner />
      </div>
    </>
  );
}
