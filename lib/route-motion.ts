/** Tab order (left → right) for horizontal slide direction. */
const TAB_ORDER = ["/", "/scan", "/ask", "/activity", "/profile"] as const;

/** Full-screen flows — treated as “forward” from home. */
const FLOW_ROUTES = ["/send", "/receive", "/swap", "/bridge", "/contacts"] as const;

function tabIndex(path: string): number {
  const base = path.split("?")[0] ?? path;
  const idx = TAB_ORDER.indexOf(base as (typeof TAB_ORDER)[number]);
  if (idx >= 0) return idx;
  if (FLOW_ROUTES.some((r) => base.startsWith(r))) return 100;
  if (base.startsWith("/setup-username")) return -1;
  return 50;
}

/** 1 = slide in from right (forward), -1 = slide in from left (back). */
export function getSlideDirection(fromPath: string, toPath: string): number {
  const from = fromPath.split("?")[0] ?? fromPath;
  const to = toPath.split("?")[0] ?? toPath;

  if (from === to) return 1;

  const fromTab = TAB_ORDER.includes(from as (typeof TAB_ORDER)[number]);
  const toTab = TAB_ORDER.includes(to as (typeof TAB_ORDER)[number]);

  if (fromTab && toTab) {
    return tabIndex(to) > tabIndex(from) ? 1 : -1;
  }

  const fromFlow = FLOW_ROUTES.some((r) => from.startsWith(r));
  const toFlow = FLOW_ROUTES.some((r) => to.startsWith(r));

  if (!fromFlow && toFlow) return 1;
  if (fromFlow && !toFlow) return -1;
  if (fromFlow && toFlow) return 1;

  return tabIndex(to) >= tabIndex(from) ? 1 : -1;
}
