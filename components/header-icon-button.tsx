import type { ReactNode } from "react";

const baseClass =
  "glide-m3-icon-btn glide-tap inline-flex h-11 w-11 shrink-0 items-center justify-center";

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
