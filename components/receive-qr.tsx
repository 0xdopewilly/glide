"use client";

import Image from "next/image";

export function ReceiveQr({ address }: { address: string }) {
  if (!address) return null;

  const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(address)}`;

  return (
    <div className="mx-auto mt-8 w-[min(100%,244px)]">
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
    </div>
  );
}
