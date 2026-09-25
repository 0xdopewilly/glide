"use client";

import { headerIconButtonClassName } from "@/components/header-icon-button";
import { MoneyStackArt, PaperHeroArt } from "@/components/illustrations";
import type { ThreadItem, ThreadResponse } from "@/app/api/thread/route";
import { useGoBack } from "@/lib/use-go-back";
import { ChevronLeft, HandCoins, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** A payment thread with one person: every payment and request between you,
 * as chat bubbles (notes are the "messages"), with Send / Request below. */
export default function ThreadPage() {
  const goBack = useGoBack("/");
  const params = useSearchParams();
  const withParam = params.get("with")?.trim() ?? "";
  const [data, setData] = useState<ThreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!withParam) return;
    let cancelled = false;
    fetch(`/api/thread?with=${encodeURIComponent(withParam)}`)
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as ThreadResponse & { error?: string };
        if (cancelled) return;
        if (!r.ok) setError(d.error ?? "Couldn't load this conversation");
        else setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this conversation");
      });
    return () => {
      cancelled = true;
    };
  }, [withParam]);

  // Newest at the bottom, like a chat.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data]);

  const groups = useMemo(() => {
    const out: { day: string; items: ThreadItem[] }[] = [];
    for (const item of data?.items ?? []) {
      const day = dayLabel(item.createdAt);
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(item);
      else out.push({ day, items: [item] });
    }
    return out;
  }, [data]);

  const cp = data?.counterparty;
  const target = cp?.username ? `@${cp.username}` : cp?.address ?? withParam;
  const initial = (cp?.displayName || cp?.username || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={goBack} className={headerIconButtonClassName()} aria-label="Back">
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[17px] font-bold tracking-tight text-[color:var(--glide-on-surface)]">
            {cp ? cp.displayName || cp.label : "…"}
          </p>
          {cp?.username ? (
            <p className="truncate text-[12.5px] text-[color:var(--glide-on-surface-variant)]">
              @{cp.username}
            </p>
          ) : null}
        </div>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-[16px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #8B6CF6 0%, #5B3DF5 100%)" }}
          aria-hidden
        >
          {cp?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cp.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
      </header>

      <div ref={listRef} className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-3">
        {error ? (
          <p className="mt-10 text-center text-[15px] text-[color:var(--glide-on-surface-variant)]">
            {error}
          </p>
        ) : !data ? (
          <p className="mt-10 text-center text-[15px] text-[color:var(--glide-on-surface-variant)]">
            Loading…
          </p>
        ) : data.items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center text-center">
            <PaperHeroArt className="h-44 w-auto" />
            <p className="mt-4 text-[17px] font-bold text-[color:var(--glide-on-surface)]">
              No payments yet
            </p>
            <p className="mt-1 max-w-[16rem] text-[14px] text-[color:var(--glide-on-surface-variant)]">
              Money you send to or get from {cp?.label} will show up here.
            </p>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-2 pt-2">
            {groups.map((g) => (
              <div key={g.day} className="flex flex-col gap-2">
                <p className="my-1 text-center text-[12px] font-semibold text-[color:var(--glide-on-surface-variant)]">
                  {g.day}
                </p>
                {g.items.map((item) => (
                  <Bubble key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {cp ? (
        <div className="flex shrink-0 gap-2 px-5 pb-[max(0.75rem,var(--glide-safe-bottom))] pt-2">
          <Link
            href={`/send?to=${encodeURIComponent(target)}`}
            className="glide-tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
            style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
          >
            <Send className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Send money
          </Link>
          {cp?.username ? (
            <Link
              href={`/request?from=${encodeURIComponent(cp.username)}`}
              className="glide-tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-[color:var(--glide-on-surface)]"
              style={{
                background: "var(--glide-surface-container-high)",
                border: "1px solid var(--glide-border)",
              }}
            >
              <HandCoins className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Request money
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Bubble({ item }: { item: ThreadItem }) {
  const mine = item.kind === "sent" || item.kind === "request_out";
  const pending = item.status && !["COMPLETE", "CONFIRMED", "paid"].includes(item.status);
  const chip =
    item.kind === "sent"
      ? "You sent"
      : item.kind === "received"
        ? "You received"
        : item.kind === "request_out"
          ? "You requested"
          : "Requested from you";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] overflow-hidden rounded-3xl ${mine ? "rounded-br-lg" : "rounded-bl-lg"}`}
        style={
          mine
            ? { background: "linear-gradient(150deg, #7C5CFF 0%, #5B3DF5 100%)", color: "#FFFFFF" }
            : {
                background: "var(--glide-surface-container-high)",
                border: "1px solid var(--glide-border)",
                color: "var(--glide-on-surface)",
              }
        }
      >
        {item.kind === "received" ? (
          <div className="flex justify-center bg-white/90 px-4 pt-3">
            <MoneyStackArt className="h-20 w-auto" />
          </div>
        ) : null}
        <div className="px-4 pb-3 pt-3">
          <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#17153B]">
            {chip}
          </span>
          <p className="mt-2 text-[26px] font-bold leading-none tracking-tight tabular-nums">
            {item.amount}
          </p>
          {item.note ? <p className="mt-1.5 text-[13.5px] opacity-90">{item.note}</p> : null}
          <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px] opacity-75">
            <span>{pending ? (item.kind.startsWith("request") ? "Pending" : "Processing") : ""}</span>
            <span>{timeLabel(item.createdAt)}</span>
          </div>
          {item.requestCode ? (
            <Link
              href={`/pay/${item.requestCode}`}
              className="glide-tap mt-3 flex h-10 items-center justify-center rounded-full text-[14px] font-semibold"
              style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
            >
              Pay {item.amount}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
