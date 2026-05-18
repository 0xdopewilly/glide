"use client";

import { ArrowUp } from "lucide-react";
import { FormEvent, useState } from "react";

export function ChatBar() {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="shrink-0 px-6 pb-3 pt-2">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-full bg-neutral-100 py-1.5 pl-5 pr-1.5 dark:bg-[#1c1c1e]"
      >
        <label htmlFor="glide-chat" className="sr-only">
          Ask Glide
        </label>
        <input
          id="glide-chat"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Glide to send, swap, or bridge"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium tracking-tight text-neutral-950 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none dark:text-white dark:placeholder:text-white/35"
          autoComplete="off"
        />
        <button
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white active:scale-95 dark:bg-white dark:text-[#0a0a0a]"
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
