"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import Image from "next/image";
import { useReportCount } from "@/hooks/useRoadGuard";

// Dynamic imports
const HeroSection = dynamic(() => import("@/components/landing/HeroSection"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-mantle-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner w-10 h-10" />
        <p className="text-mantle-text-secondary">Loading RoadGuard...</p>
      </div>
    </div>
  ),
});

const Dashboard = dynamic(() => import("@/components/dashboard/EnhancedDashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-mantle-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner w-10 h-10" />
        <p className="text-mantle-text-secondary">Loading Dashboard...</p>
      </div>
    </div>
  ),
});

type AppView = "landing" | "connect" | "dashboard";

export default function Home() {
  const { isConnected } = useAccount();
  const { data: reportCount } = useReportCount();
  const [view, setView] = useState<AppView>("landing");
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Auto-transition to dashboard when connected
  useEffect(() => {
    if (isConnected && view === "connect") {
      setView("dashboard");
      setShowConnectModal(false);
    }
  }, [isConnected, view]);

  const handleGetStarted = () => {
    if (isConnected) {
      setView("dashboard");
    } else {
      setShowConnectModal(true);
    }
  };

  // Only pass real data from the contract - no fake numbers
  const stats = reportCount && Number(reportCount) > 0
    ? { totalReports: Number(reportCount) }
    : undefined;

  return (
    <main className="min-h-screen bg-mantle-bg-primary">
      <AnimatePresence mode="wait">
        {view === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HeroSection onGetStarted={handleGetStarted} stats={stats} />
          </motion.div>
        )}

        {view === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard onBack={() => setView("landing")} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connect Wallet Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowConnectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-mantle-bg-elevated rounded-3xl p-6 border border-white/10"
            >
              <div className="text-center mb-6">
                <div className="w-32 h-32 mx-auto mb-4 relative">
                  <Image
                    src="/images/no-connection.png"
                    alt="Connect Wallet"
                    fill
                    className="object-contain"
                  />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
                <p className="text-sm text-mantle-text-secondary">
                  Connect your wallet to start reporting incidents and earning rewards
                </p>
              </div>

              <div className="space-y-3">
                <ConnectButton />
              </div>

              <p className="text-xs text-mantle-text-tertiary text-center mt-4">
                By connecting, you agree to our Terms of Service
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
