import {
  ArrowDownLeft,
  CalendarClock,
  HandCoins,
  QrCode,
  Send,
  Split,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PaymentAction = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

const ACTIONS = {
  send: { id: "send", href: "/send", title: "Send", subtitle: "To a pay tag, contact or address", icon: Send },
  request: { id: "request", href: "/request", title: "Request", subtitle: "Get paid with a link or QR code", icon: HandCoins },
  receive: { id: "receive", href: "/receive", title: "Receive", subtitle: "Your address and QR code", icon: ArrowDownLeft },
  scan: { id: "scan", href: "/send?scan=1", title: "Scan to pay", subtitle: "Pay with a QR code", icon: QrCode },
  split: { id: "split", href: "/ask?q=Split a bill with my friends", title: "Split a bill", subtitle: "Divide costs with Billy", icon: Split },
  scheduled: { id: "scheduled", href: "/scheduled", title: "Scheduled payments", subtitle: "Rent, allowances, subscriptions", icon: CalendarClock },
  bridge: { id: "bridge", href: "/bridge", title: "Bridge", subtitle: "Send USDC to another chain", icon: Workflow },
  contacts: { id: "contacts", href: "/contacts", title: "Contacts", subtitle: "People you pay", icon: Users },
} satisfies Record<string, PaymentAction>;

/** Payments tab, top group. */
export const PAYMENT_PRIMARY: PaymentAction[] = [
  ACTIONS.send,
  ACTIONS.request,
  ACTIONS.receive,
  ACTIONS.scan,
];

/** Payments tab, second group. */
export const PAYMENT_MORE: PaymentAction[] = [
  ACTIONS.split,
  ACTIONS.scheduled,
  ACTIONS.bridge,
  ACTIONS.contacts,
];

/** Home "More" sheet — everything not already a round button on Home
 * (Send, Receive, Swap). */
export const HOME_MORE_ACTIONS: PaymentAction[] = [
  ACTIONS.request,
  ACTIONS.scan,
  ACTIONS.split,
  ACTIONS.scheduled,
  ACTIONS.bridge,
];
