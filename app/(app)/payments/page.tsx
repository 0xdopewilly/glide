"use client";

import { PageHeader } from "@/components/page-header";
import { SettingsRow, SettingsSection } from "@/components/settings-list";
import { PAYMENT_MORE, PAYMENT_PRIMARY } from "@/lib/payment-actions";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <SettingsSection className="!mt-2">
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
