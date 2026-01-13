import { http, createConfig } from "wagmi";
import { mantle } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// MAINNET ONLY Configuration - Mantle Network
export const config = createConfig({
  chains: [mantle],
  connectors: [
    injected({
      target: "metaMask",
    }),
  ],
  transports: {
    [mantle.id]: http("https://rpc.mantle.xyz"),
  },
});

// Contract address - DEPLOYED ON MANTLE MAINNET
export const ROADGUARD_ADDRESS = {
  [mantle.id]: "0x23a95d01af99F06c446522765E6F3E604865D58a" as `0x${string}`,
} as const;

// Minimum stake: 0.001 MNT
export const MIN_STAKE = BigInt("1000000000000000");

// Platform fee: 2.5% of rewards
export const PLATFORM_FEE_PERCENT = 2.5;

// Chain ID for Mantle Mainnet
export const MANTLE_CHAIN_ID = 5000;
