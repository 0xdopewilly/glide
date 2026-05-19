"use client";

import type { ActionSuccessType } from "@/lib/chat-cache";
import { shortenAddress } from "@/lib/format";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Globe2, Send } from "lucide-react";

const CONFIG: Record<
  ActionSuccessType,
  {
    label: string;
    gradient: string;
    Icon: LucideIcon;
  }
> = {
  send: {
    label: "Payment sent",
    gradient: "from-emerald-500 via-emerald-600 to-teal-600",
    Icon: Send,
  },
  swap: {
    label: "Swap done",
    gradient: "from-violet-500 via-violet-600 to-indigo-600",
    Icon: ArrowLeftRight,
  },
  bridge: {
    label: "Bridge done",
    gradient: "from-sky-500 via-blue-600 to-indigo-600",
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
  network,
}: {
  action: ActionSuccessType;
  amount?: string;
  recipientName?: string;
  to?: string;
  targetToken?: string;
  network?: string;
}) {
  const { label, gradient, Icon } = CONFIG[action];
  const recipient =
    recipientName?.trim() ||
    (to ? shortenAddress(to) : action === "send" ? "recipient" : "");

  let detail = "";
  if (action === "send" && recipient) {
    detail = `to ${recipient}`;
  } else if (action === "swap") {
    detail = `to ${targetToken?.trim() || "EURC"}`;
  } else if (action === "bridge") {
    const net = formatNetwork(network);
    detail = net ? `to ${net}` : "in progress";
  }

  return (
    <div className="flex justify-center px-1 py-2">
      <div
        className={`glide-chat-card flex aspect-square w-[min(100%,300px)] max-w-[300px] flex-col items-center justify-center rounded-[28px] bg-gradient-to-br ${gradient} p-6 text-center text-white`}
        role="status"
        aria-label={`${label}${amount ? `: $${amount}` : ""}`}
      >
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25">
          <Icon className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
          {label}
        </p>
        {amount ? (
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
            ${amount}
          </p>
        ) : null}
        {detail ? (
          <p className="mt-2 max-w-[220px] text-sm font-medium leading-snug text-white/90">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
