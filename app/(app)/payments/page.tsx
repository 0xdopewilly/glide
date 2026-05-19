"use client";

import { PageHeader } from "@/components/page-header";
import {
  CalendarClock,
  ChevronRight,
  HandCoins,
  QrCode,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const PAYMENT_ACTIONS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/send",
    title: "Send money",
    description: "Pay a Glide Tag, wallet, or contact",
    icon: Send,
  },
  {
    href: "/send?scan=1",
    title: "Scan to pay",
    description: "Scan a QR code when sending",
    icon: QrCode,
  },
  {
    href: "/request",
    title: "Request cash",
    description: "Get paid with a link or QR",
    icon: HandCoins,
  },
  {
    href: "/scheduled",
    title: "Scheduled sends",
    description: "Rent, allowances, subscriptions",
    icon: CalendarClock,
  },
  {
    href: "/ask?q=Split a bill with my friends",
    title: "Split a bill",
    description: "Divide costs with Glide Assist",
    icon: Users,
  },
];

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <p className="mt-1 text-sm glide-muted">
          Send, request, schedule, and split — all in one place.
        </p>
        <ul className="mt-5 flex flex-col gap-2">
          {PAYMENT_ACTIONS.map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                prefetch
                className="glide-tap flex items-center gap-3.5 rounded-2xl px-4 py-3.5 glide-surface-card"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-white/10">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-tight">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs glide-muted">
                    {description}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 glide-muted" strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
