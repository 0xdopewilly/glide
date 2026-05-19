"use client";

import { useWallet } from "@/context/wallet-context";
import {
  ArrowDownLeft,
  ChevronRight,
  Plus,
  QrCode,
  Send,
} from "lucide-react";
import Link from "next/link";

const ROW =
  "flex w-full items-center gap-4 border-b py-4 text-left transition-opacity active:opacity-70";

export function VenmoActionList() {
  const { fundWallet, loading } = useWallet();

  const rows = [
    { href: "/scan", icon: QrCode, label: "Scan code" },
    { href: "/request", icon: ArrowDownLeft, label: "Request" },
    { href: "/send", icon: Send, label: "Pay" },
  ] as const;

  return (
    <nav
      aria-label="Quick actions"
      className="mt-2 border-t"
      style={{ borderColor: "var(--glide-border)" }}
    >
      {rows.map(({ href, icon: Icon, label }) => (
        <Link
          key={label}
          href={href}
          className={ROW}
          style={{ borderColor: "var(--glide-border)" }}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--glide-accent) 14%, transparent)",
              color: "var(--glide-accent)",
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-[17px] font-medium tracking-tight">
            {label}
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0 opacity-40"
            strokeWidth={2}
          />
        </Link>
      ))}
      <button
        type="button"
        onClick={() => void fundWallet()}
        disabled={loading}
        className={`${ROW} disabled:opacity-50`}
        style={{ borderColor: "var(--glide-border)" }}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--glide-accent) 14%, transparent)",
            color: "var(--glide-accent)",
          }}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 flex-1 text-left text-[17px] font-medium tracking-tight">
          Add cash
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 opacity-40" strokeWidth={2} />
      </button>
    </nav>
  );
}
