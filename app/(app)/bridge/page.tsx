"use client";

import {
  FormField,
  inputClassName,
} from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { FlowPage } from "@/components/flow-page";
import { useWallet } from "@/context/wallet-context";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NETWORKS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "base", label: "Base" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
];

export default function BridgePage() {
  const router = useRouter();
  const { addLocalTransaction } = useWallet();
  const [network, setNetwork] = useState(NETWORKS[0].value);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const networkLabel =
    NETWORKS.find((n) => n.value === network)?.label ?? network;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (Number.isNaN(n) || n <= 0) return;
    setSubmitting(true);
    addLocalTransaction({
      id: `bridge-${Date.now()}`,
      title: `Bridge to ${networkLabel}`,
      amount: `−$${n.toFixed(2)}`,
      variant: "debit",
      meta: "Just now",
      kind: "bridge",
      status: "pending",
    });
    setSubmitting(false);
    router.push("/activity");
  };

  return (
    <FlowPage title="Bridge" backHref="/">
      <form onSubmit={handleSubmit} className="flex flex-col px-5 pb-8">
        <p className="mt-2 text-sm glide-muted">Move USDC to another network.</p>
        <FormField id="bridge-network" label="Destination network" className="mt-6">
          <select
            id="bridge-network"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className={inputClassName}
          >
            {NETWORKS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="bridge-amount" label="Amount" className="mt-4">
          <input
            id="bridge-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={inputClassName}
            required
          />
        </FormField>
        <GlideButton
          type="submit"
          disabled={submitting}
          className="mt-8"
          uppercase={false}
        >
          {submitting ? "Processing" : "Confirm Bridge"}
        </GlideButton>
      </form>
    </FlowPage>
  );
}
