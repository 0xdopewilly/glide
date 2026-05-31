"use client";

import { PageHeader } from "@/components/page-header";
import { shortenAddress } from "@/lib/format";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Contact = { id: string; name: string; walletAddress: string };

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      const data = (await res.json()) as { contacts?: Contact[] };
      if (res.ok) setContacts(data.contacts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Contacts" backHref="/profile" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8">
        {loading ? (
          <ul className="mt-4 space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-16 animate-pulse rounded-2xl"
                style={{ background: "var(--glide-surface-container)" }}
              />
            ))}
          </ul>
        ) : contacts.length === 0 ? (
          <div
            className="mt-8 flex flex-col items-center rounded-2xl border px-6 py-12 text-center"
            style={{
              background: "var(--glide-surface-elevated)",
              borderColor: "var(--glide-border)",
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--glide-primary-container)" }}
            >
              <UserPlus className="h-5 w-5 text-[var(--glide-text)]" />
            </div>
            <p className="mt-3 text-[15px] font-semibold text-[var(--glide-text)]">
              No contacts yet
            </p>
            <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-[var(--glide-muted)]">
              People you send to will land here so you can pay them by name
              next time.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {contacts.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/send?to=${encodeURIComponent(c.walletAddress)}`,
                    )
                  }
                  className="glide-tap flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors"
                  style={{
                    background: "var(--glide-surface-elevated)",
                    borderColor: "var(--glide-border)",
                  }}
                >
                  <span>
                    <span className="block font-semibold tracking-tight text-[var(--glide-text)]">
                      {c.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-[var(--glide-muted)]">
                      {shortenAddress(c.walletAddress)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--glide-accent)]">
                    Send
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
