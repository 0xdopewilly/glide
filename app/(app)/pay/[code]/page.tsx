"use client";

import { FlowPage } from "@/components/flow-page";
import { GlideButton } from "@/components/glide-button";
import {
  currencyPrefixForToken,
  stableTokenFromSymbol,
} from "@/lib/currency-format";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

type RequestInfo = {
  amount: string;
  token?: string;
  note: string | null;
  status: string;
  requester: { username: string | null; displayName: string | null };
  payTo: string | null;
};

export default function PayRequestPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<RequestInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/request/${code}`);
        const data = (await res.json()) as RequestInfo & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Request not found");
          return;
        }
        setInfo(data);
      } catch {
        setError("Could not load payment request");
      }
    })();
  }, [code]);

  const name = info?.requester.displayName?.trim() || null;
  const tag = info?.requester.username ? `@${info.requester.username}` : null;
  const label = name ?? tag ?? "Someone";

  const goPay = () => {
    if (!info?.payTo) return;
    const q = new URLSearchParams();
    q.set("to", info.payTo);
    q.set("amount", info.amount);
    q.set("token", stableTokenFromSymbol(info.token));
    if (info.note) q.set("note", info.note);
    q.set("request", code);
    router.push(`/send?${q.toString()}`);
  };

  return (
    <FlowPage title="Pay request" backHref="/">
      <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : !info ? (
          <div className="w-full max-w-xs space-y-3" aria-hidden>
            <div
              className="mx-auto h-3 w-20 animate-pulse rounded"
              style={{ background: "var(--glide-surface-container-high)" }}
            />
            <div
              className="mx-auto h-12 w-40 animate-pulse rounded-xl"
              style={{ background: "var(--glide-surface-container-high)" }}
            />
            <div
              className="mx-auto mt-4 h-11 w-full animate-pulse rounded-2xl"
              style={{ background: "var(--glide-surface-container)" }}
            />
          </div>
        ) : info.status === "processing" ? (
          <p className="text-sm glide-muted">
            A payment for this request is going through.
          </p>
        ) : info.status !== "pending" ? (
          <p className="text-sm glide-muted">This request was already paid.</p>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-[var(--glide-text)]">
              {label} requested
            </p>
            {name && tag ? (
              <p className="mt-0.5 text-[13px] glide-muted">{tag}</p>
            ) : null}
            <p className="mt-4 text-5xl font-bold tabular-nums">
              {currencyPrefixForToken(info.token)}
              {info.amount}
            </p>
            <p className="mt-1 text-[13px] font-medium glide-muted">
              {stableTokenFromSymbol(info.token)}
            </p>
            {info.note ? (
              <p className="mt-2 text-base glide-muted">&ldquo;{info.note}&rdquo;</p>
            ) : null}
            <GlideButton onClick={goPay} className="mt-10 max-w-sm" uppercase={false}>
              Pay {label === "Someone" ? "now" : label.split(" ")[0]}
            </GlideButton>
          </>
        )}
      </div>
    </FlowPage>
  );
}
