"use client";

import { ArrowUpRight, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Grouped settings list, Revolut / iOS style: an optional caption above one
 * rounded card of rows. Shared by Settings, Personal details and the Home
 * "More" sheet so every list in the app looks the same. */
export function SettingsSection({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-6 shrink-0 ${className}`}>
      {title ? (
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-[var(--glide-muted)]">
          {title}
        </h2>
      ) : null}
      <div className="glide-surface-card overflow-hidden rounded-2xl py-1">
        {children}
      </div>
    </section>
  );
}

export function SettingsIcon({
  icon: Icon,
  destructive = false,
}: {
  icon: LucideIcon;
  destructive?: boolean;
}) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{
        background: destructive
          ? "color-mix(in srgb, var(--glide-error) 12%, transparent)"
          : "var(--glide-surface-container-high)",
        color: destructive ? "var(--glide-error)" : "var(--glide-text)",
      }}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
    </span>
  );
}

type RowProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  /** Short trailing text, e.g. "On" or "@tag". */
  value?: ReactNode;
  /** Custom trailing control (switch, segmented control). Replaces the chevron. */
  trailing?: ReactNode;
  href?: string;
  /** Opens in a new tab and shows an out-arrow instead of a chevron. */
  external?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** For switch rows: exposes the row as an ARIA switch. */
  switchChecked?: boolean;
};

const ROW_CLASS =
  "glide-tap flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50";

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  trailing,
  href,
  external = false,
  onClick,
  destructive = false,
  disabled = false,
  switchChecked,
}: RowProps) {
  const navigable = Boolean(href || onClick) && trailing === undefined;
  const body = (
    <>
      <SettingsIcon icon={icon} destructive={destructive} />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[15px] font-semibold tracking-tight"
          style={{ color: destructive ? "var(--glide-error)" : "var(--glide-text)" }}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[12.5px] text-[var(--glide-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {value !== undefined ? (
        <span className="shrink-0 text-[13px] font-medium text-[var(--glide-muted)]">
          {value}
        </span>
      ) : null}
      {trailing !== undefined ? (
        <span className="shrink-0">{trailing}</span>
      ) : navigable ? (
        external ? (
          <ArrowUpRight
            className="h-[18px] w-[18px] shrink-0 text-[var(--glide-muted)]"
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="h-5 w-5 shrink-0 text-[var(--glide-muted)]"
            strokeWidth={2}
            aria-hidden
          />
        )
      ) : null}
    </>
  );

  if (href && !disabled) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={ROW_CLASS}>
        {body}
      </a>
    ) : (
      <Link href={href} prefetch className={ROW_CLASS}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={ROW_CLASS}
        {...(switchChecked !== undefined
          ? { role: "switch", "aria-checked": switchChecked }
          : {})}
      >
        {body}
      </button>
    );
  }
  return <div className={ROW_CLASS.replace("glide-tap ", "")}>{body}</div>;
}

/** On/off switch visual. Instant (no slide animation) per the motion policy;
 * the row itself is the control, so this is aria-hidden. */
export function SettingsSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-[26px] w-[44px] items-center rounded-full"
      style={{
        background: checked
          ? "var(--glide-primary)"
          : "color-mix(in srgb, var(--glide-text) 18%, transparent)",
      }}
    >
      <span
        className="h-[22px] w-[22px] rounded-full bg-white shadow-sm"
        style={{ transform: `translate3d(${checked ? 20 : 2}px, 0, 0)` }}
      />
    </span>
  );
}
