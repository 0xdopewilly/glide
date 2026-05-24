"use client";

import { copyText } from "@/lib/clipboard";
import { ArrowDownUp, Check, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const inputClass =
  "w-full rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-3.5 text-[15px] font-medium tracking-tight text-slate-900 placeholder:text-slate-400 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500/40";

const primaryBtnClass =
  "mt-6 w-full rounded-2xl bg-slate-900 py-4 text-[15px] font-semibold tracking-tight text-white shadow-lg transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-gradient-to-r dark:from-indigo-600 dark:to-violet-600 dark:hover:shadow-indigo-500/25";

const labelClass =
  "mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500";

export function SendModalContent() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="pt-1"
    >
      <label className={labelClass} htmlFor="send-recipient">
        Recipient address
      </label>
      <input
        id="send-recipient"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Wallet address"
        className={inputClass}
        autoComplete="off"
      />
      <label className={`${labelClass} mt-4`} htmlFor="send-amount">
        Amount (USDC)
      </label>
      <input
        id="send-amount"
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        className={inputClass}
      />
      <button type="submit" className={primaryBtnClass}>
        Confirm Transfer
      </button>
    </form>
  );
}

export function ReceiveModalContent({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const displayAddress =
    walletAddress ?? "Your account address will appear here";

  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    const ok = await copyText(walletAddress);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  return (
    <div className="pt-1">
      <p className="text-sm font-medium tracking-tight text-slate-500 dark:text-zinc-400">
        Share this address to receive funds
      </p>
      <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/80">
        <p className="break-all font-mono text-[13px] font-medium leading-relaxed tracking-tight text-slate-800 dark:text-zinc-200">
          {displayAddress}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!walletAddress}
        className={`${primaryBtnClass} flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {copied ? (
          <>
            <Check className="h-5 w-5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-5 w-5" />
            Copy Address
          </>
        )}
      </button>
    </div>
  );
}

export function SwapModalContent() {
  const [fromAmount, setFromAmount] = useState("");
  const rate = 0.92;

  const toAmount = useMemo(() => {
    const n = parseFloat(fromAmount);
    if (Number.isNaN(n) || n <= 0) return "";
    return (n * rate).toFixed(2);
  }, [fromAmount]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="pt-1"
    >
      <label className={labelClass} htmlFor="swap-from">
        From USDC
      </label>
      <input
        id="swap-from"
        type="number"
        min="0"
        step="0.01"
        value={fromAmount}
        onChange={(e) => setFromAmount(e.target.value)}
        placeholder="0.00"
        className={inputClass}
      />
      <div className="my-4 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
          <ArrowDownUp className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
        </span>
      </div>
      <label className={labelClass} htmlFor="swap-to">
        To EURC
      </label>
      <input
        id="swap-to"
        readOnly
        value={toAmount}
        placeholder="0.00"
        className={`${inputClass} opacity-90`}
      />
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
        <span className="font-medium tracking-tight text-slate-500 dark:text-zinc-400">
          Exchange rate
        </span>
        <span className="font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
          1 USDC ≈ {rate} EURC
        </span>
      </div>
      <button type="submit" className={primaryBtnClass}>
        Confirm Swap
      </button>
    </form>
  );
}

const BRIDGE_NETWORKS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "base", label: "Base" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
];

export function BridgeModalContent() {
  const [network, setNetwork] = useState(BRIDGE_NETWORKS[0].value);
  const [amount, setAmount] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="pt-1"
    >
      <label className={labelClass} htmlFor="bridge-network">
        Destination network
      </label>
      <select
        id="bridge-network"
        value={network}
        onChange={(e) => setNetwork(e.target.value)}
        className={inputClass}
      >
        {BRIDGE_NETWORKS.map((n) => (
          <option key={n.value} value={n.value}>
            {n.label}
          </option>
        ))}
      </select>
      <label className={`${labelClass} mt-4`} htmlFor="bridge-amount">
        Amount
      </label>
      <input
        id="bridge-amount"
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        className={inputClass}
      />
      <button type="submit" className={primaryBtnClass}>
        Confirm Bridge
      </button>
    </form>
  );
}
