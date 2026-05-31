"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full bg-[var(--glide-bg)] text-[var(--glide-text)]">
      <header className="sticky top-0 z-10 border-b bg-[var(--glide-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link
            href="/"
            className="glide-tap inline-flex h-9 w-9 items-center justify-center rounded-full border"
            style={{
              borderColor: "var(--glide-border)",
              background: "var(--glide-surface-container)",
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-[18px] font-bold tracking-tight">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-6">
        <p className="glide-label-mono mb-6 text-[11px] font-semibold text-[var(--glide-muted)]">
          Last updated {updated}
        </p>
        <article className="space-y-5 text-[15px] leading-[1.65] text-[var(--glide-text)] [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:tracking-tight [&_strong]:font-semibold [&_a]:underline [&_p]:text-[var(--glide-muted)] [&_li]:text-[var(--glide-muted)] [&_ul]:mt-2 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:list-disc">
          {children}
        </article>
      </main>
    </div>
  );
}
