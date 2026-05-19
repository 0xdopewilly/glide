import type { ReactNode } from "react";

const baseClass =
  "glide-tap inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-200/80 hover:text-neutral-950 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white";

export function headerIconButtonClassName(extra = "") {
  return extra ? `${baseClass} ${extra}` : baseClass;
}

export function HeaderIconButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  return (
    <button type="button" className={headerIconButtonClassName(className)} {...props}>
      {children}
    </button>
  );
}

export function HeaderIconLink({
  children,
  className = "",
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
}) {
  return (
    <a href={href} className={headerIconButtonClassName(className)} {...props}>
      {children}
    </a>
  );
}
