"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const CLOSE_MS = 200;

/** Bottom sheet: slides up, slides back down on backdrop tap, Escape or the
 * close button (CSS in globals.css — transform/opacity only). Portalled to
 * <body> so the tab bar can't paint over it. `children` may be a function
 * that receives `close` (for actions that should dismiss the sheet). */
export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center ${closing ? "glide-sheet-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ fontFamily: "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        className="glide-sheet-backdrop absolute inset-0 bg-black/45"
      />
      <div
        className="glide-sheet-panel glide-surface-card relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-b-none rounded-t-3xl pb-[max(1rem,var(--glide-safe-bottom))] pt-2"
        style={{ borderBottom: "none" }}
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="glide-tap flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--glide-surface-container-high)", color: "var(--glide-text)" }}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>,
    document.body,
  );
}
