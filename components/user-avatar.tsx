"use client";

import { useProfile } from "@/context/wallet-context";
import Image from "next/image";
import Link from "next/link";

export function UserAvatar({
  size = "md",
  linked = false,
}: {
  size?: "sm" | "md" | "lg";
  linked?: boolean;
}) {
  const { profile } = useProfile();
  const initial =
    profile.displayName.trim().charAt(0).toUpperCase() || "G";

  const sizeClass =
    size === "sm"
      ? "h-10 w-10 text-sm"
      : size === "lg"
        ? "h-20 w-20 text-2xl"
        : "h-14 w-14 text-lg";

  const inner = profile.avatarUrl ? (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${sizeClass}`}
    >
      <Image
        src={profile.avatarUrl}
        alt=""
        fill
        className="object-cover"
        unoptimized
      />
    </span>
  ) : (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-semibold tracking-tight text-neutral-800 dark:bg-[var(--glide-surface-container-high)] dark:text-white ${sizeClass}`}
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
