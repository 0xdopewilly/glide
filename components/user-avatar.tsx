"use client";

import { useWallet } from "@/context/wallet-context";
import Link from "next/link";

export function UserAvatar({
  size = "md",
  linked = false,
}: {
  size?: "sm" | "md" | "lg";
  linked?: boolean;
}) {
  const { profile } = useWallet();
  const initial =
    profile.displayName.trim().charAt(0).toUpperCase() || "G";

  const sizeClass =
    size === "sm"
      ? "h-10 w-10 text-sm"
      : size === "lg"
        ? "h-20 w-20 text-2xl"
        : "h-14 w-14 text-lg";

  const inner = (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight text-white ${sizeClass}`}
      style={{ background: "var(--glide-accent)" }}
    >
      {initial}
    </span>
  );

  if (linked) {
    return (
      <Link href="/profile" prefetch aria-label="Profile">
        {inner}
      </Link>
    );
  }

  return inner;
}
