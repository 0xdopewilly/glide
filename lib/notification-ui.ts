import type { NotificationType } from "@/lib/notifications";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  Bell,
  Globe2,
  HandCoins,
} from "lucide-react";

const DEFAULT_UI = {
  Icon: Bell,
  accent: "bg-neutral-500/10 text-neutral-600 dark:text-white/60",
} as const;

export const NOTIFICATION_UI: Record<
  NotificationType,
  { Icon: LucideIcon; accent: string }
> = {
  payment_received: {
    Icon: ArrowDownLeft,
    accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  payment_request: {
    Icon: HandCoins,
    accent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  request_paid: {
    Icon: HandCoins,
    accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  swap_complete: {
    Icon: ArrowLeftRight,
    accent: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  bridge_complete: {
    Icon: Globe2,
    accent: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
};

export function notificationUiFor(type: string) {
  return NOTIFICATION_UI[type as NotificationType] ?? DEFAULT_UI;
}
