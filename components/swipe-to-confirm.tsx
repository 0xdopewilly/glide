"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type Props = {
  label: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  successLabel?: string;
};

export function SwipeToConfirm({ label, onConfirm, disabled, loading, successLabel = "Done" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [completed, setCompleted] = useState(false);

  const fillWidth = useTransform(x, (v) => `${v + 56}px`); // fills under thumb
  const labelOpacity = useTransform(x, [0, 100], [1, 0]);

  async function triggerConfirm() {
    const track = trackRef.current;
    const max = track ? track.offsetWidth - 56 : 0;
    if (max > 0) {
      animate(x, max, { type: "spring", stiffness: 400, damping: 30 });
    }
    setCompleted(true);
    try {
      await onConfirm();
    } finally {
      setTimeout(() => {
        setCompleted(false);
        animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      }, 1500);
    }
  }

  async function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const track = trackRef.current;
    if (!track) return;
    const max = track.offsetWidth - 56; // 56 = thumb width + insets
    const threshold = max * 0.85;
    if (info.offset.x >= threshold) {
      await triggerConfirm();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled || loading || completed) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void triggerConfirm();
    }
  }

  const showCompleted = completed || loading;

  return (
    <div
      ref={trackRef}
      className="relative h-14 w-full overflow-hidden rounded-full border"
      style={{
        background: "var(--glide-surface-container)",
        borderColor: "var(--glide-elevated-border)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Fill that grows under the thumb */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full"
        style={{ width: fillWidth, background: "var(--glide-primary)", opacity: 0.15 }}
      />
      {/* Label */}
      <motion.span
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums"
        style={{
          color: "var(--glide-on-surface)",
          opacity: showCompleted ? 0 : labelOpacity,
        }}
      >
        {label} →
      </motion.span>
      {/* Success label */}
      {showCompleted && !loading && (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold"
          style={{ color: "var(--glide-primary)" }}
        >
          ✓ {successLabel}
        </span>
      )}
      {/* Draggable thumb */}
      <motion.button
        type="button"
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completed || loading ? 100 : 0}
        aria-disabled={disabled || loading}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        drag={disabled || loading ? false : "x"}
        dragConstraints={trackRef}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="absolute left-1 top-1 flex h-12 w-12 cursor-grab items-center justify-center rounded-full active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--glide-primary)]"
        whileTap={{ scale: 0.95 }}
      >
        <span
          className="flex h-full w-full items-center justify-center rounded-full shadow-md"
          style={{ background: "var(--glide-primary)" }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : completed ? (
            <Check className="h-5 w-5 text-white" />
          ) : (
            <ArrowRight className="h-5 w-5 text-white" />
          )}
        </span>
      </motion.button>
    </div>
  );
}
