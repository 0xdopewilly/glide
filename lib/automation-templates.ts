/** Pre-built automation templates (F5). "instant" templates POST directly to
 * /api/automations; "assisted" templates open Billy pre-loaded so the user can
 * supply the missing details (recipient, amount). Client-safe: pure data. */
export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
} & (
  | { mode: "instant"; body: Record<string, unknown> }
  | { mode: "assisted"; prompt: string }
);

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "savings-plan",
    name: "Savings Plan",
    description: "Save 10% of every payment you receive.",
    emoji: "🐷",
    mode: "instant",
    body: { type: "save_on_receive", percent: 10 },
  },
  {
    id: "power-saver",
    name: "Power Saver",
    description: "Save 25% of every payment, automatically.",
    emoji: "💪",
    mode: "instant",
    body: { type: "save_on_receive", percent: 25 },
  },
  {
    id: "freelancer-tax",
    name: "Freelancer Tax Set-Aside",
    description: "Stash 30% of income for taxes.",
    emoji: "🧾",
    mode: "instant",
    body: { type: "save_on_receive", percent: 30 },
  },
  {
    id: "overflow",
    name: "Overflow to Savings",
    description: "Anything over $1,000 sweeps into Savings.",
    emoji: "🌊",
    mode: "instant",
    body: { type: "threshold_save", thresholdAmount: "1000" },
  },
  {
    id: "business-payroll",
    name: "Business Payroll",
    description: "Pay your team on a recurring schedule.",
    emoji: "🏢",
    mode: "assisted",
    prompt: "Set up weekly payroll: send $",
  },
  {
    id: "family-allowance",
    name: "Family Allowance",
    description: "Send an allowance on a schedule.",
    emoji: "👨‍👩‍👧",
    mode: "assisted",
    prompt: "Send a weekly allowance of $20 to @",
  },
  {
    id: "subscription",
    name: "Subscription",
    description: "Schedule a recurring subscription payment.",
    emoji: "🔁",
    mode: "assisted",
    prompt: "Pay $ every month to @",
  },
];
