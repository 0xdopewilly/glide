"use client";

import { QrScanner } from "@/components/qr-scanner";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function SendScanSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col">
          <motion.button
            type="button"
            aria-label="Close scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Scan QR code"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative mt-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-[#141416]"
          >
            <div className="flex items-center justify-between border-b px-5 py-4 dark:border-white/10">
              <h2 className="text-lg font-semibold tracking-tight">Scan to pay</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-[#1c1c1e]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-8 pt-4">
              <QrScanner />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
