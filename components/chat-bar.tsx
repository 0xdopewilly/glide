"use client";

import { ArrowUp } from "lucide-react";
import { FormEvent, useState } from "react";

export function ChatBar() {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="shrink-0 border-t border-[var(--glide-border)] bg-[color-mix(in_srgb,var(--glide-shell)_80%,transparent)] px-4 pb-3 pt-2 backdrop-blur-xl">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-full border p-1.5 pl-5"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-border)",
        }}
      >
        <label htmlFor="glide-chat" className="sr-only">
          Ask Glide
        </label>
        <input
          id="glide-chat"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Glide to send, swap, or bridge"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium tracking-tight placeholder:font-normal focus:outline-none"
          style={{ color: "var(--glide-text)" }}
          autoComplete="off"
        />
        <button
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:scale-95"
          style={{ background: "var(--glide-accent)" }}
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
