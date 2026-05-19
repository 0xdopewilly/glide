"use client";

import { PageHeader } from "@/components/page-header";
import { shortenAddress } from "@/lib/format";
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
          <ul className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-neutral-100 dark:bg-[#1c1c1e]"
              />
            ))}
          </ul>
        ) : contacts.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-neutral-100 px-4 py-10 text-center text-sm glide-muted dark:bg-[#1c1c1e]">
            Contacts you save after sending will show up here.
          </p>
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
                  className="glide-tap flex w-full items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3.5 text-left dark:bg-[#1c1c1e]"
                >
                  <span>
                    <span className="block font-semibold tracking-tight">
                      {c.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs glide-muted">
                      {shortenAddress(c.walletAddress)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-violet-500">
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
