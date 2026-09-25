"use client";

import { PageHeader } from "@/components/page-header";
import { SettingsRow, SettingsSection } from "@/components/settings-list";
import { PAYMENT_MORE, PAYMENT_PRIMARY } from "@/lib/payment-actions";
import { Search } from "lucide-react";
import Link from "next/link";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <Link
          href="/search"
          prefetch
          className="glide-tap mt-1 flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-medium"
          style={{
            background: "var(--glide-surface-container-high)",
            border: "1px solid var(--glide-border)",
            color: "var(--glide-on-surface-variant)",
          }}
        >
          <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} aria-hidden />
          Search people, @tags and payments
        </Link>
        <SettingsSection className="!mt-4">
          {PAYMENT_PRIMARY.map((a) => (
            <SettingsRow
              key={a.id}
              icon={a.icon}
              title={a.title}
              subtitle={a.subtitle}
              href={a.href}
            />
          ))}
        </SettingsSection>
        <SettingsSection title="More">
          {PAYMENT_MORE.map((a) => (
            <SettingsRow
              key={a.id}
              icon={a.icon}
              title={a.title}
              subtitle={a.subtitle}
              href={a.href}
            />
          ))}
        </SettingsSection>
      </div>
    </>
  );
}
