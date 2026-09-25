"use client";

import { headerIconButtonClassName } from "@/components/header-icon-button";
import { SettingsRow, SettingsSection } from "@/components/settings-list";
import { TransactionList } from "@/components/transaction-list";
import { useWallet } from "@/context/wallet-context";
import { shortenAddress } from "@/lib/format";
import { PAYMENT_MORE, PAYMENT_PRIMARY, type PaymentAction } from "@/lib/payment-actions";
import { useGoBack } from "@/lib/use-go-back";
import {
  ArrowLeftRight,
  AtSign,
  ChevronLeft,
  History,
  Search,
  Settings,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Contact = { id: string; name: string; walletAddress: string };

const ACTIONS: PaymentAction[] = [
  ...PAYMENT_PRIMARY,
  { id: "swap", href: "/swap", title: "Swap", subtitle: "USDC, EURC and cirBTC", icon: ArrowLeftRight },
  ...PAYMENT_MORE,
  { id: "activity", href: "/activity", title: "Activity", subtitle: "All your transactions", icon: History },
  { id: "automate", href: "/automations", title: "Automations", subtitle: "Rules that run for you", icon: Zap },
  { id: "billy", href: "/ask", title: "Ask Billy", subtitle: "Your money assistant", icon: Sparkles },
  { id: "settings", href: "/profile", title: "Settings", subtitle: "Profile, security, alerts", icon: Settings },
];

function matches(q: string, ...fields: (string | undefined | null)[]) {
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export default function SearchPage() {
  const goBack = useGoBack("/");
  const { transactions } = useWallet();
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tagMatch, setTagMatch] = useState<{ tag: string; label: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    fetch("/api/contacts")
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((d: { contacts?: Contact[] }) => {
        if (!cancelled) setContacts(d.contacts ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();

  // A query that could be a pay tag: look it up so you can pay anyone on
  // glidepay by @tag straight from search.
  const tagQuery = q.replace(/^@/, "");
  const looksLikeTag = /^[a-z0-9_]{3,20}$/.test(tagQuery);
  useEffect(() => {
    if (!looksLikeTag) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(`/api/recipient/resolve?q=${encodeURIComponent(`@${tagQuery}`)}`)
        .then((r) => r.json())
        .then((d: { resolved?: boolean; source?: string; label?: string }) => {
          if (cancelled) return;
          setTagMatch(
            d.resolved && d.source === "username" && d.label
              ? { tag: tagQuery, label: d.label }
              : null,
          );
        })
        .catch(() => {
          if (!cancelled) setTagMatch(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [looksLikeTag, tagQuery]);
  const tagResult = looksLikeTag && tagMatch?.tag === tagQuery ? tagMatch : null;

  const actionResults = useMemo(
    () => (q ? ACTIONS.filter((a) => matches(q, a.title, a.subtitle)) : ACTIONS.slice(0, 5)),
    [q],
  );
  const contactResults = useMemo(
    () => (q ? contacts.filter((c) => matches(q, c.name, c.walletAddress)).slice(0, 6) : []),
    [q, contacts],
  );
  const txResults = useMemo(
    () =>
      q
        ? transactions
            .filter((t) => matches(q, t.title, t.amount, t.meta, t.counterparty))
            .slice(0, 12)
        : [],
    [q, transactions],
  );

  const nothing =
    q && !tagResult && actionResults.length === 0 && contactResults.length === 0 && txResults.length === 0;

  return (
    <>
      <header className="relative z-10 flex shrink-0 items-center gap-2 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={goBack}
          className={headerIconButtonClassName()}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
        </button>
        <label
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-4"
          style={{
            background: "color-mix(in srgb, var(--glide-surface-container-high) 78%, transparent)",
          }}
        >
          <Search className="h-[18px] w-[18px] shrink-0 text-[var(--glide-muted)]" strokeWidth={2.25} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="People, @tags, transactions"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-[var(--glide-text)] outline-none placeholder:text-[var(--glide-muted)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="glide-tap -mr-1 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: "var(--glide-surface-container-high)" }}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : null}
        </label>
      </header>

      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {tagResult ? (
          <SettingsSection title="On glidepay">
            <SettingsRow
              icon={AtSign}
              title={`@${tagResult.label}`}
              subtitle="Open your payments together"
              href={`/thread?with=${encodeURIComponent(`@${tagResult.tag}`)}`}
            />
          </SettingsSection>
        ) : null}

        {contactResults.length > 0 ? (
          <SettingsSection title="Contacts">
            {contactResults.map((c) => (
              <SettingsRow
                key={c.id}
                icon={User}
                title={c.name}
                subtitle={shortenAddress(c.walletAddress, 6)}
                href={`/thread?with=${encodeURIComponent(c.walletAddress)}`}
              />
            ))}
          </SettingsSection>
        ) : null}

        {actionResults.length > 0 ? (
          <SettingsSection title={q ? "Actions" : "Suggested"}>
            {actionResults.map((a) => (
              <SettingsRow
                key={a.id}
                icon={a.icon}
                title={a.title}
                subtitle={a.subtitle}
                href={a.href}
              />
            ))}
          </SettingsSection>
        ) : null}

        {txResults.length > 0 ? (
          <section className="mt-6 shrink-0">
            <h2 className="mb-2 px-1 text-[13px] font-semibold text-[var(--glide-muted)]">
              Transactions
            </h2>
            <TransactionList transactions={txResults} />
          </section>
        ) : null}

        {nothing ? (
          <p className="mt-12 text-center text-[15px] text-[var(--glide-muted)]">
            No results for &ldquo;{query.trim()}&rdquo;
          </p>
        ) : null}
      </div>
    </>
  );
}
