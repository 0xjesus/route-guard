"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { motion } from "framer-motion";
import { Wallet, LogOut, Check, Loader2 } from "lucide-react";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

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

  return (
    <div className="space-y-3">
      {connectors.map((connector) => (
        <motion.button
          key={connector.uid}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-mantle-accent to-mantle-accent-dark text-black font-semibold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
