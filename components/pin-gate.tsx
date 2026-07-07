"use client";

import { registerPinHandler, type PinMode } from "@/lib/pin-gate";
import { useCallback, useEffect, useRef, useState } from "react";

const PIN_LENGTH = 6;

type Stage = "create" | "confirm";

export function PinGate() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PinMode>("verify");
  const [stage, setStage] = useState<Stage>("create");
  const [entry, setEntry] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpen(false);
    setEntry("");
    setFirstPin("");
    setError(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    registerPinHandler(
      (m) =>
        new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
          setMode(m);
          setStage("create");
          setEntry("");
          setFirstPin("");
          setError(null);
          setBusy(false);
          setOpen(true);
        }),
    );
    return () => registerPinHandler(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, stage, mode]);

  const submitVerify = useCallback(
    async (pin: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/pin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          remaining?: number;
        };
        if (res.ok) {
          finish(true);
          return;
        }
        const parts = [data.error ?? "Incorrect PIN."];
        if (typeof data.remaining === "number" && data.remaining > 0) {
          parts.push(`${data.remaining} tries left.`);
        }
        setError(parts.join(" "));
        setEntry("");
      } finally {
        setBusy(false);
      }
    },
    [finish],
  );

  const submitSet = useCallback(
    async (pin: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/pin/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.ok) {
          finish(true);
          return;
        }
        setError(data.error ?? "Couldn't set PIN.");
        setStage("create");
        setFirstPin("");
        setEntry("");
      } finally {
        setBusy(false);
      }
    },
    [finish],
  );

  const handleComplete = useCallback(
    (pin: string) => {
      if (mode === "verify") {
        void submitVerify(pin);
        return;
      }
      if (stage === "create") {
        setFirstPin(pin);
        setEntry("");
        setStage("confirm");
        return;
      }
      if (pin !== firstPin) {
        setError("PINs didn't match. Start over.");
        setFirstPin("");
        setEntry("");
        setStage("create");
        return;
      }
      void submitSet(pin);
    },
    [mode, stage, firstPin, submitVerify, submitSet],
  );

  const onChange = (raw: string) => {
    if (busy) return;
    const digits = raw.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setEntry(digits);
    if (digits.length === PIN_LENGTH) handleComplete(digits);
  };

  const forgot = async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/pin/reset", { method: "POST" });
      setMode("setup");
      setStage("create");
      setEntry("");
      setFirstPin("");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const title =
    mode === "verify"
      ? "Enter your PIN"
      : stage === "create"
        ? "Create a 6-digit PIN"
        : "Confirm your PIN";
  const subtitle =
    mode === "verify"
      ? "Confirm this transaction."
      : stage === "create"
        ? "You'll use this to approve transfers."
        : "Re-enter it to confirm.";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!busy) finish(false);
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-elevated-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
          {title}
        </p>
        <p className="mt-1 text-center text-[13px] text-[var(--glide-muted)]">
          {subtitle}
        </p>

        <div className="relative mt-7 py-2">
          <div className="flex w-full justify-center gap-3">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full transition-colors"
                style={{
                  background:
                    i < entry.length
                      ? "var(--glide-primary)"
                      : "var(--glide-border)",
                }}
              />
            ))}
          </div>
          <input
            ref={inputRef}
            value={entry}
            onChange={(e) => onChange(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            aria-label="PIN"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {error ? (
          <p className="mt-3 text-center text-[13px] font-semibold text-red-500">
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-2">
          {mode === "verify" ? (
            <button
              type="button"
              onClick={() => void forgot()}
              disabled={busy}
              className="py-1 text-center text-[13px] font-semibold text-[var(--glide-accent)] disabled:opacity-50"
            >
              Forgot PIN?
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => finish(false)}
            disabled={busy}
            className="glide-tap w-full rounded-full border py-3 text-[14px] font-semibold disabled:opacity-50"
            style={{
              borderColor: "var(--glide-border)",
              color: "var(--glide-text)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
