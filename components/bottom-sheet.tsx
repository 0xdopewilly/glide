"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`absolute inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out will-change-[opacity] ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        aria-hidden={!open}
        className={`absolute inset-x-0 bottom-0 z-50 flex max-h-[min(88%,560px)] flex-col rounded-t-[28px] border-t border-slate-200/80 bg-white shadow-[0_-24px_80px_rgba(0,0,0,0.12)] transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform dark:border-zinc-700/60 dark:bg-zinc-900 dark:shadow-[0_-24px_80px_rgba(0,0,0,0.45)] ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-zinc-600"
          aria-hidden
        />
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
          <h2
            id="bottom-sheet-title"
            className="text-lg font-semibold tracking-tight text-slate-900 dark:text-zinc-50"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="glide-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </>
  );
}
