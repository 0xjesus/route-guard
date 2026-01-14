import { http, createConfig } from "wagmi";
import { mantle } from "wagmi/chains";
import { injected, walletConnect, metaMask } from "wagmi/connectors";

// WalletConnect Project ID - Get one at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id";

// MAINNET ONLY Configuration - Mantle Network
export const config = createConfig({
  chains: [mantle],
  connectors: [
    // MetaMask - works in browser extension AND MetaMask mobile in-app browser
    metaMask({
      dappMetadata: {
        name: "RoadGuard",
        url: typeof window !== "undefined" ? window.location.origin : "https://roadguard.app",
      },
    }),
    // WalletConnect - for mobile wallet apps (MetaMask, Trust, etc.)
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: "RoadGuard",
        description: "Decentralized road incident reporting on Mantle",
        url: typeof window !== "undefined" ? window.location.origin : "https://roadguard.app",
        icons: ["https://roadguard.app/images/logo.png"],
      },
      showQrModal: true,
    }),
    // Generic injected - fallback for other wallets
    injected({
      shimDisconnect: true,
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
