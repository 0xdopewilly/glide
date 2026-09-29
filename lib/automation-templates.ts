/** Pre-built automation templates (F5). "instant" templates POST directly to
 * /api/automations; "assisted" templates open Billy pre-loaded so the user can
 * supply the missing details (recipient, amount). Client-safe: pure data. */
/** Icon keys; the Automations page maps them to lucide icons. */
export type AutomationTemplateIcon =
  | "piggy-bank"
  | "percent"
  | "receipt"
  | "overflow"
  | "briefcase"
  | "users"
  | "repeat";

export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  icon: AutomationTemplateIcon;
} & (
  | { mode: "instant"; body: Record<string, unknown> }
  | { mode: "assisted"; prompt: string }
);

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "savings-plan",
    name: "Save 10%",
    description: "Save 10% of every payment you receive.",
    icon: "piggy-bank",
    mode: "instant",
    body: { type: "save_on_receive", percent: 10 },
  },
  {
    id: "power-saver",
    name: "Save 25%",
    description: "Save 25% of every payment you receive.",
    icon: "percent",
    mode: "instant",
    body: { type: "save_on_receive", percent: 25 },
  },
  {
    id: "freelancer-tax",
    name: "Tax set-aside",
    description: "Put 30% of what you're paid aside for taxes.",
    icon: "receipt",
    mode: "instant",
    body: { type: "save_on_receive", percent: 30 },
  },
  {
    id: "overflow",
    name: "Overflow to Savings",
    description: "Anything over $1,000 sweeps into Savings.",
    icon: "overflow",
    mode: "instant",
    body: { type: "threshold_save", thresholdAmount: "1000" },
  },
  {
    id: "business-payroll",
    name: "Payroll",
    description: "Pay your team on a recurring schedule.",
    icon: "briefcase",
    mode: "assisted",
    prompt: "Set up weekly payroll",
  },
  {
    id: "family-allowance",
    name: "Allowance",
    description: "Send an allowance on a schedule.",
    icon: "users",
    mode: "assisted",
    prompt: "Set up a weekly allowance",
  },
  {
    id: "subscription",
    name: "Subscription",
    description: "Schedule a recurring subscription payment.",
    icon: "repeat",
    mode: "assisted",
    prompt: "Set up a monthly subscription payment",
  },
];
