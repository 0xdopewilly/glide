"use client";

import { FlowPage } from "@/components/flow-page";
import { GlideButton } from "@/components/glide-button";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

type RequestInfo = {
  amount: string;
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

  const label =
    info?.requester.username != null
      ? `@${info.requester.username}`
      : info?.requester.displayName ?? "Someone";

  const goPay = () => {
    if (!info?.payTo) return;
    const q = new URLSearchParams();
    q.set("to", info.payTo);
    q.set("amount", info.amount);
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
          <p className="text-sm glide-muted">Loading…</p>
        ) : info.status !== "pending" ? (
          <p className="text-sm glide-muted">This request was already paid.</p>
        ) : (
          <>
            <p className="text-sm font-medium glide-muted">Pay {label}</p>
            <p className="mt-4 text-5xl font-bold tabular-nums">${info.amount}</p>
            {info.note ? (
              <p className="mt-2 text-base glide-muted">&ldquo;{info.note}&rdquo;</p>
            ) : null}
            <GlideButton onClick={goPay} className="mt-10 max-w-sm" uppercase={false}>
              Pay now
            </GlideButton>
          </>
        )}
      </div>
    </FlowPage>
  );
}
