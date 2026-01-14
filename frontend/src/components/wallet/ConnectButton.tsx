"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { motion } from "framer-motion";
import { Wallet, LogOut, Check, Loader2, ExternalLink, Smartphone } from "lucide-react";
import { useCallback, useMemo } from "react";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Detect if we're on mobile
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Detect if MetaMask is installed (browser extension or in-app browser)
  const hasInjectedProvider = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!(window as any).ethereum;
  }, []);

  // Open MetaMask deep link on mobile
  const openInMetaMask = useCallback(() => {
    const currentUrl = window.location.href;
    // MetaMask deep link format
    const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, "")}`;
    window.location.href = metamaskDeepLink;
  }, []);

  if (isConnected && address) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-mantle-bg-tertiary rounded-xl">
          <div className="w-10 h-10 rounded-full bg-mantle-accent/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-mantle-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Connected</p>
            <p className="text-xs text-mantle-text-tertiary font-mono">{truncateAddress(address)}</p>
          </div>
        </div>
        <button
          onClick={() => disconnect()}
          className="w-full py-3 rounded-xl bg-mantle-error/10 border border-mantle-error/30 text-mantle-error font-medium flex items-center justify-center gap-2 hover:bg-mantle-error/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>
    );
  }

  // On mobile without injected provider, show "Open in MetaMask" button first
  if (isMobile && !hasInjectedProvider) {
    return (
      <div className="space-y-3">
        {/* Primary: Open in MetaMask App */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={openInMetaMask}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-3"
        >
          <Smartphone className="w-5 h-5" />
          Open in MetaMask App
          <ExternalLink className="w-4 h-4" />
        </motion.button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-mantle-bg-primary text-mantle-text-tertiary">or use WalletConnect</span>
          </div>
        </div>

        {/* Secondary: WalletConnect */}
        {connectors
          .filter((c) => c.id === "walletConnect")
          .map((connector) => (
            <motion.button
              key={connector.uid}
              whileTap={{ scale: 0.98 }}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-mantle-bg-elevated border border-white/10 text-white font-medium flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  {connector.name}
                </>
              )}
            </motion.button>
          ))}
      </div>
    );
  }

  // Desktop or mobile with injected provider (MetaMask in-app browser)
  return (
    <div className="space-y-3">
      {connectors.map((connector) => {
        // Skip showing injected if MetaMask is already shown
        if (connector.id === "injected" && connectors.some((c) => c.id === "metaMaskSDK")) {
          return null;
        }

        const isMetaMask = connector.id === "metaMaskSDK" || connector.id === "io.metamask";
        const isWalletConnect = connector.id === "walletConnect";

        return (
          <motion.button
            key={connector.uid}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
              isMetaMask
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                : isWalletConnect
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                : "bg-gradient-to-r from-mantle-accent to-mantle-accent-dark text-black"
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                {connector.name}
              </>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
