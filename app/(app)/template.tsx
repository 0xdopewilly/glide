"use client";

/**
 * Authenticated-shell template. INTENTIONALLY a passthrough — no key={pathname},
 * no enter animation, no remount on navigation. Tab navigation must be instant
 * (see CLAUDE.md "Motion / performance"). Each route handles its own entrance
 * effects locally; this wrapper exists only because Next requires a template
 * file for the route group.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
