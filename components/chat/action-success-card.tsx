"use client";

import type { ActionSuccessType } from "@/lib/chat-cache";
import { formatStableAmount } from "@/lib/currency-format";
import { shortenAddress } from "@/lib/format";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Globe2, Send } from "lucide-react";

// Success reads as a receipt: the app's card surface, a green status line,
// the amount. Failures and cancellations are handled elsewhere.
const CONFIG: Record<
  ActionSuccessType,
  {
    label: string;
    Icon: LucideIcon;
  }
> = {
  send: {
    label: "Payment sent",
    Icon: Send,
  },
  swap: {
    label: "Swap done",
    Icon: ArrowLeftRight,
  },
  bridge: {
    label: "Bridge done",
    Icon: Globe2,
  },
};

function formatNetwork(network?: string) {
  if (!network) return "";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

export function ActionSuccessCard({
  action,
  amount,
  recipientName,
  to,
  targetToken,
  token,
  receivedAmount,
  network,
}: {
  action: ActionSuccessType;
  amount?: string;
  recipientName?: string;
  to?: string;
  token?: string;
  targetToken?: string;
  receivedAmount?: string;
  network?: string;
}) {
  const { label, Icon } = CONFIG[action];
  const recipient =
    recipientName?.trim() ||
    (to ? shortenAddress(to) : action === "send" ? "recipient" : "");

  let detail = "";
  if (action === "send" && recipient) {
    detail = `to ${recipient}`;
  } else if (action === "swap") {
    const out = targetToken?.trim() || "EURC";
    if (amount && receivedAmount) {
      detail = `${formatStableAmount(amount, "USDC")} → ${formatStableAmount(receivedAmount, "EURC")}`;
    } else {
      detail = `to ${out}`;
    }
  } else if (action === "bridge") {
    const net = formatNetwork(network);
    detail = net ? `to ${net}` : "in progress";
  }

  return (
    <div className="flex w-full justify-end px-1 py-2">
      <div
        className="glide-chat-card w-[min(100%,280px)] shrink-0 rounded-2xl rounded-br-md border p-4"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-elevated-border)",
        }}
        role="status"
        aria-label={`${label}${amount ? `: ${formatStableAmount(amount, action === "swap" ? "USDC" : token)}` : ""}`}
      >
        <p
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
          style={{ color: "var(--glide-success)" }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          {label}
        </p>
        {amount || receivedAmount ? (
          <p className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums text-[var(--glide-text)]">
            {action === "swap" && receivedAmount
              ? formatStableAmount(receivedAmount, "EURC")
              : formatStableAmount(
                  amount ?? receivedAmount ?? "0",
                  action === "swap" ? "USDC" : token,
                )}
          </p>
        ) : null}
        {detail ? (
          <p className="mt-1.5 text-[13px] leading-snug text-[var(--glide-muted)]">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
