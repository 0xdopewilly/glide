import type { CustomTransport, EIP1193RequestFn } from "viem";

const SCA_INCOMPATIBLE_FEE_FIELDS = [
  "gas",
  "gasPrice",
  "maxFeePerGas",
  "maxPriorityFeePerGas",
] as const;

type AccountType = "SCA" | "EOA" | undefined;

function getTransactionParam(
  params: readonly unknown[],
): Record<string, unknown> | undefined {
  const tx = params[0];
  return typeof tx === "object" && tx !== null
    ? (tx as Record<string, unknown>)
    : undefined;
}

/** Strip viem gas hints for Circle SCA wallets before eth_sendTransaction. */
export function withScaFeeInterceptor(
  inner: CustomTransport,
  resolveAccountType: (address: string) => Promise<AccountType>,
): CustomTransport {
  return ((opts) => {
    const transport = inner(opts);
    const origRequest = transport.request as EIP1193RequestFn;

    const wrappedRequest: EIP1193RequestFn = async ({ method, params }) => {
      if (method === "eth_sendTransaction" && Array.isArray(params)) {
        const tx = getTransactionParam(params);
        const from =
          typeof tx?.from === "string" ? (tx.from as string) : undefined;
        if (from && tx) {
          const accountType = await resolveAccountType(from);
          if (accountType === "SCA") {
            const stripped = Object.fromEntries(
              Object.entries(tx).filter(
                ([key]) =>
                  !SCA_INCOMPATIBLE_FEE_FIELDS.includes(
                    key as (typeof SCA_INCOMPATIBLE_FEE_FIELDS)[number],
                  ),
              ),
            );
            return origRequest({
              method,
              params: [stripped, ...params.slice(1)],
            });
          }
        }
      }
      return origRequest({ method, params });
    };

    return { ...transport, request: wrappedRequest };
  }) as CustomTransport;
}
