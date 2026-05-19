"use client";

import { compressAvatarFile } from "@/lib/image-compress";
import { Camera } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function ProfileAvatarUpload({
  displayName,
  avatarUrl,
  onPick,
  disabled,
}: {
  displayName: string;
  avatarUrl?: string | null;
  onPick: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      alert("Please choose an image under 8MB");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressAvatarFile(file);
      onPick(dataUrl);
    } catch {
      alert("Could not process that image. Try a different photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="glide-tap relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-[#2c2c2e]"
        aria-label="Change profile photo"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-3xl font-semibold text-neutral-800 dark:text-white">
            {initial}
          </span>
        )}
        <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
          <Camera className="h-4 w-4" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
