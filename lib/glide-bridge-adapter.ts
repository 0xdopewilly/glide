import { ViemAdapter } from "@circle-fin/adapter-viem-v2";
import {
  ArcTestnet,
  ArbitrumSepolia,
  BaseSepolia,
  EthereumSepolia,
  PolygonAmoy,
} from "@circle-fin/app-kit/chains";
import { http as circleHttp } from "@circle-fin/usdckit/providers/circle-wallets";
import { createBridgeReadTransport } from "@/lib/bridge-rpc";
import { withScaFeeInterceptor } from "@/lib/sca-fee-transport";
import {
  createPublicClient,
  createWalletClient,
  type CustomTransport,
  type Transport,
} from "viem";

const GLIDE_BRIDGE_CHAINS = [
  ArcTestnet,
  EthereumSepolia,
  BaseSepolia,
  PolygonAmoy,
  ArbitrumSepolia,
] as const;

export type GlideBridgeAdapterOptions = {
  apiKey: string;
  entitySecret: string;
  baseUrl?: string;
};

const signingTransportCache: Record<number, CustomTransport> = {};

function getCircleSigningTransport(
  options: GlideBridgeAdapterOptions,
  chainId: number,
): CustomTransport {
  const cached = signingTransportCache[chainId];
  if (cached) return cached;

  const inner = circleHttp({
    apiKey: options.apiKey,
    entitySecret: options.entitySecret,
    ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
    chainId,
  });

  const wrapped = withScaFeeInterceptor(inner, async () => "SCA");
  signingTransportCache[chainId] = wrapped;
  return wrapped;
}

/**
 * Circle signing + public RPC for reads - fixes native-balance RPC failures on testnets.
 */
export function createGlideBridgeAdapter(options: GlideBridgeAdapterOptions) {
  return new ViemAdapter(
    {
      getPublicClient: ({ chain }) => {
        const signing = getCircleSigningTransport(options, chain.id);
        const readTransport = createBridgeReadTransport(chain, signing);
        return createPublicClient({
          chain,
          transport: readTransport,
        });
      },
      getWalletClient: ({ chain }) => {
        const signing = getCircleSigningTransport(options, chain.id);
        return createWalletClient({
          chain,
          transport: signing as Transport,
        });
      },
    },
    {
      addressContext: "developer-controlled",
      supportedChains: [...GLIDE_BRIDGE_CHAINS],
    },
  );
}
