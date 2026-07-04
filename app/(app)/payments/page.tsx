"use client";

import { PageHeader } from "@/components/page-header";
import {
  ArrowDownLeft,
  CalendarClock,
  HandCoins,
  QrCode,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Tile = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const TILES: Tile[] = [
  {
    href: "/send",
    title: "Send",
    description: "To a tag, wallet, or contact",
    icon: Send,
  },
  {
    href: "/receive",
    title: "Receive",
    description: "Share your address",
    icon: ArrowDownLeft,
  },
  {
    href: "/request",
    title: "Request",
    description: "Get paid with a link",
    icon: HandCoins,
  },
  {
    href: "/send?scan=1",
    title: "Scan",
    description: "Pay with a QR code",
    icon: QrCode,
  },
  {
    href: "/scheduled",
    title: "Schedule",
    description: "Rent, allowances, subs",
    icon: CalendarClock,
  },
  {
    href: "/automations",
    title: "Automations",
    description: "Auto-save, rules that run for you",
    icon: Sparkles,
  },
  {
    href: "/ask?q=Split a bill with my friends",
    title: "Split a bill",
    description: "Divide costs with the assistant",
    icon: Users,
  },
];

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <p className="mt-1 text-sm text-[var(--glide-muted)]">
          Send, request, schedule, and split. All in one place.
        </p>
        <div className="glide-stagger mt-5 grid grid-cols-2 gap-3">
          {TILES.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch
              className="glide-tap glide-on-elevated-surface group relative flex min-h-[9.5rem] flex-col justify-between rounded-3xl border p-4"
              style={{
                background: "var(--glide-surface-elevated)",
                borderColor: "var(--glide-elevated-border)",
              }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: "var(--glide-accent)",
                  color: "var(--glide-on-primary)",
                }}
              >
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="mt-auto">
                <p className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
                  {title}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--glide-muted)]">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
