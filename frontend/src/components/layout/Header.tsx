"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from "wagmi";
import { formatEther } from "viem";
import {
  Wallet,
  LogOut,
  ChevronDown,
  Copy,
  ExternalLink,
  Menu,
  X,
  Info,
  AlertTriangle,
  Shield,
  Smartphone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";
import { PLATFORM_FEE_PERCENT } from "@/lib/wagmi";

const MANTLE_CHAIN_ID = 5000;

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWrongNetwork = isConnected && chainId !== MANTLE_CHAIN_ID;

  // Detect if we're on mobile
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Detect if MetaMask is installed
  const hasInjectedProvider = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!(window as any).ethereum;
  }, []);

  // Open MetaMask deep link on mobile
  const openInMetaMask = useCallback(() => {
    const currentUrl = window.location.href;
    const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, "")}`;
    window.location.href = metamaskDeepLink;
  }, []);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = () => {
    // On mobile without injected provider, show modal with options
    if (isMobile && !hasInjectedProvider) {
      setShowConnectModal(true);
      return;
    }
    // Otherwise connect directly with first available connector
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const handleConnectorConnect = (connector: any) => {
    connect({ connector });
    setShowConnectModal(false);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-sticky",
          "bg-mantle-bg-primary/90 backdrop-blur-xl border-b border-white/5",
          className
        )}
      >
        <div className="container-app">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="RoadGuard Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="text-headline-sm font-bold text-mantle-text-primary">RoadGuard</h1>
                <p className="text-label-sm text-mantle-text-tertiary">Privacy-First on Mantle</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              {/* How it Works */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHowItWorks(true)}
              >
                <Info className="w-4 h-4" />
                How It Works
              </Button>

              {/* Platform Fee Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-mantle-accent/10 border border-mantle-accent/20">
                <span className="text-label-sm text-mantle-accent">Fee:</span>
                <span className="text-label-sm font-bold text-mantle-text-primary">{PLATFORM_FEE_PERCENT}%</span>
              </div>

              {/* Contract Link */}
              <a
                href="https://mantlescan.xyz/address/0x23a95d01af99F06c446522765E6F3E604865D58a"
                target="_blank"
                rel="noopener noreferrer"
                className="text-label-sm text-mantle-text-tertiary hover:text-mantle-accent transition-colors flex items-center gap-1"
              >
                Contract
                <ExternalLink className="w-3 h-3" />
              </a>
            </nav>

            {/* Wallet Section */}
            <div className="flex items-center gap-3">
              {isConnected ? (
                isWrongNetwork ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => switchChain({ chainId: MANTLE_CHAIN_ID })}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Switch to Mantle</span>
                    <span className="sm:hidden">Switch</span>
                  </Button>
                ) : (
                  <div className="relative">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setShowWalletMenu(!showWalletMenu)}
                      className="gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-mantle-success animate-pulse" />
                      <span className="hidden sm:inline font-mono">{formatAddress(address!)}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          showWalletMenu && "rotate-180"
                        )}
                      />
                    </Button>

                    {/* Wallet Dropdown */}
                    <AnimatePresence>
                      {showWalletMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-72 bg-mantle-bg-card rounded-2xl p-4 shadow-elevation-4 border border-white/10"
                        >
                          <div className="space-y-4">
                            {/* Balance */}
                            <div className="text-center pb-3 border-b border-white/10">
                              <p className="text-label-md text-mantle-text-tertiary mb-1">Balance</p>
                              <p className="text-headline-md font-bold gradient-text">
                                {balance ? Number(formatEther(balance.value)).toFixed(4) : "0.00"}{" "}
                                <span className="text-body-md text-mantle-text-secondary">MNT</span>
                              </p>
                            </div>

                            {/* Address */}
                            <div className="flex items-center justify-between">
                              <span className="text-body-sm text-mantle-text-secondary font-mono">
                                {formatAddress(address!)}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={copyAddress}
                                  className="text-mantle-text-tertiary"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    window.open(`https://mantlescan.xyz/address/${address}`, "_blank")
                                  }
                                  className="text-mantle-text-tertiary"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {copied && (
                              <p className="text-label-sm text-mantle-success text-center">
                                Address copied!
                              </p>
                            )}

                            {/* Disconnect */}
                            <Button
                              variant="danger"
                              fullWidth
                              onClick={() => {
                                disconnect();
                                setShowWalletMenu(false);
                              }}
                            >
                              <LogOut className="w-4 h-4" />
                              Disconnect
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              ) : (
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  loading={isConnecting}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect MetaMask</span>
                  <span className="sm:hidden">Connect</span>
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Tech Stack Bar */}
        <div className="bg-mantle-bg-secondary/60 backdrop-blur-sm border-t border-white/5 py-1">
          <div className="container-app">
            <div className="flex items-center justify-center gap-3 sm:gap-6 text-label-sm text-mantle-text-tertiary overflow-x-auto scrollbar-hide">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-mantle-accent" />
                Mantle L2
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Solidity 0.8.24
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Next.js 15
              </span>
              <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Privacy-First
              </span>
              <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-mantle-bg-card"
            >
              <nav className="container-app py-4 space-y-2">
                <button
                  onClick={() => {
                    setShowHowItWorks(true);
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center gap-2 w-full py-3 px-4 rounded-xl text-body-md text-mantle-text-secondary hover:bg-mantle-bg-tertiary transition-colors"
                >
                  <Info className="w-4 h-4" />
                  How It Works
                </button>
                <a
                  href="https://mantlescan.xyz/address/0x23a95d01af99F06c446522765E6F3E604865D58a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-3 px-4 rounded-xl text-body-md text-mantle-text-secondary hover:bg-mantle-bg-tertiary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Contract
                </a>
                <div className="py-3 px-4">
                  <p className="text-label-sm text-mantle-text-tertiary">Platform Fee</p>
                  <p className="text-headline-sm font-bold text-mantle-accent">{PLATFORM_FEE_PERCENT}%</p>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* How it Works Modal */}
      <Modal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        title="How RoadGuard Works"
        size="lg"
      >
        <div className="space-y-6">
          {/* Privacy Highlight */}
          <div className="p-4 rounded-xl bg-mantle-accent/10 border border-mantle-accent/20">
            <h3 className="text-headline-sm font-semibold text-mantle-accent mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy-First Reporting
            </h3>
            <p className="text-body-sm text-mantle-text-secondary">
              Your identity is protected using a commit-reveal scheme. Only you know your passphrase,
              and your wallet address is never linked to your reports on-chain.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-mantle-accent flex items-center justify-center text-mantle-black font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-body-md font-semibold text-mantle-text-primary">Report an Incident</h4>
                <p className="text-body-sm text-mantle-text-secondary mt-1">
                  Tap on the map to select a location, choose the event type, and stake a small amount
                  (min 0.001 MNT) to prove you&apos;re serious.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-mantle-accent flex items-center justify-center text-mantle-black font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="text-body-md font-semibold text-mantle-text-primary">Community Verification</h4>
                <p className="text-body-sm text-mantle-text-secondary mt-1">
                  Other users confirm or deny your report. After 3 confirmations,
                  your report is verified and stake is returned.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-mantle-accent flex items-center justify-center text-mantle-black font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="text-body-md font-semibold text-mantle-text-primary">Earn Rewards</h4>
                <p className="text-body-sm text-mantle-text-secondary mt-1">
                  Users who benefit from your report can send you &quot;tips&quot; (tips).
                  Claim anytime with your passphrase.
                </p>
              </div>
            </div>
          </div>

          {/* Business Model */}
          <div className="p-4 rounded-xl bg-mantle-bg-tertiary border border-white/5">
            <h3 className="text-headline-sm font-semibold text-mantle-text-primary mb-2">
              💰 Business Model
            </h3>
            <p className="text-body-sm text-mantle-text-secondary mb-3">
              RoadGuard takes a <span className="text-mantle-accent font-bold">{PLATFORM_FEE_PERCENT}% fee</span> on
              all claimed rewards. This funds development and infrastructure.
            </p>
            <div className="flex items-center gap-2 text-label-sm text-mantle-text-tertiary">
              <span>Contract:</span>
              <a
                href="https://mantlescan.xyz/address/0x23a95d01af99F06c446522765E6F3E604865D58a"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-mantle-accent hover:underline"
              >
                0x23a9...D58a
              </a>
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={() => setShowHowItWorks(false)}
          >
            Got it, Let&apos;s Start!
          </Button>
        </div>
      </Modal>

      {/* Connect Wallet Modal - for mobile */}
      <Modal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        title="Connect Wallet"
        size="md"
      >
        <div className="space-y-4">
          {/* Primary: Open in MetaMask App */}
          <button
            onClick={openInMetaMask}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-3 active:scale-98 transition-transform"
          >
            <Smartphone className="w-5 h-5" />
            Open in MetaMask App
            <ExternalLink className="w-4 h-4" />
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-mantle-bg-card text-mantle-text-tertiary">or use WalletConnect</span>
            </div>
          </div>

          {/* WalletConnect option */}
          {connectors
            .filter((c) => c.id === "walletConnect")
            .map((connector) => (
              <button
                key={connector.uid}
                onClick={() => handleConnectorConnect(connector)}
                disabled={isConnecting}
                className="w-full py-3 rounded-xl bg-mantle-bg-elevated border border-white/10 text-white font-medium flex items-center justify-center gap-3 disabled:opacity-50 active:scale-98 transition-transform"
              >
                {isConnecting ? (
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
              </button>
            ))}

          <p className="text-center text-label-sm text-mantle-text-tertiary">
            Don&apos;t have MetaMask? Download it from the App Store or Play Store.
          </p>
        </div>
      </Modal>
    </>
  );
}
