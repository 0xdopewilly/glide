"use client";

import { useAuth } from "@/context/auth-context";
import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushNotificationsToggle({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        Boolean(vapidPublic),
    );
  }, [vapidPublic]);

  const subscribe = useCallback(async () => {
    if (!user || !vapidPublic) return false;
    const reg = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic),
    });

    const json = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
    return res.ok;
  }, [user, vapidPublic]);

  const unsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch(
        `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
        { method: "DELETE" },
      );
      await sub.unsubscribe();
    }
    setEnabled(false);
  }, []);

  useEffect(() => {
    if (!supported || !user) return;
    void navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setEnabled(Boolean(sub));
    });
  }, [supported, user]);

  if (!supported) {
    return (
      <p className={`text-xs glide-muted ${className}`}>
        Push alerts need VAPID keys on the server (see DEPLOY.md).
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void (async () => {
          try {
            if (enabled) await unsubscribe();
            else {
              const ok = await subscribe();
              setEnabled(ok);
            }
          } finally {
            setBusy(false);
          }
        })();
      }}
      className={`glide-tap flex w-full items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3.5 dark:bg-[var(--glide-surface-container)] ${className}`}
    >
      <span className="flex items-center gap-3">
        {enabled ? (
          <Bell className="h-5 w-5 text-violet-500" />
        ) : (
          <BellOff className="h-5 w-5 glide-muted" />
        )}
        <span className="text-left">
          <span className="block text-sm font-semibold tracking-tight">
            Payment alerts
          </span>
          <span className="block text-xs glide-muted">
            {enabled ? "On when you receive USDC" : "Get notified when money arrives"}
          </span>
        </span>
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          enabled
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-neutral-200 text-neutral-600 dark:bg-white/10 dark:text-white/50"
        }`}
      >
        {enabled ? "On" : "Off"}
      </span>
    </button>
  );
}
