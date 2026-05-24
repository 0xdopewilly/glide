"use client";

import { GlideButton } from "@/components/glide-button";
import { copyText } from "@/lib/clipboard";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <GlideButton
      type="button"
      onClick={handleCopy}
      disabled={!value}
      className={className}
      uppercase={false}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </GlideButton>
  );
}
