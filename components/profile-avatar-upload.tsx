"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

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
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 200_000) {
      alert("Please choose an image under 200KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPick(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-[#2c2c2e]"
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
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
