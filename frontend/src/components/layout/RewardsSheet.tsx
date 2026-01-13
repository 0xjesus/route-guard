"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import {
  Gift,
  Key,
  Wallet,
  TrendingUp,
  Check,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { BottomSheet, Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePendingRewards, useClaimRewards, useReporterIdentity } from "@/hooks/useRoadGuard";

interface RewardsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RewardsSheet({ isOpen, onClose }: RewardsSheetProps) {
  const { address, isConnected } = useAccount();
  const { identity, loadIdentity, createIdentity, clearIdentity } = useReporterIdentity();
  const { data: pendingRewards } = usePendingRewards(identity?.commitment);
  const { claimRewards, isPending, isConfirming, isSuccess, error, hash } = useClaimRewards();

  const [passphrase, setPassphrase] = useState("");
  const [showRecoverInput, setShowRecoverInput] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  const handleClaim = async () => {
    if (!identity || !address) return;
    try {
      await claimRewards(identity.secret, address);
    } catch (e) {
      console.error("Claim error:", e);
    }
  };

  const handleRecover = () => {
    if (passphrase.length < 8) return;
    createIdentity(passphrase);
    setShowRecoverInput(false);
    setPassphrase("");
  };

  const formattedRewards = pendingRewards ? Number(formatEther(pendingRewards)).toFixed(6) : "0.000000";
  const hasRewards = pendingRewards && pendingRewards > BigInt(0);

  const SheetComponent = isMobile ? BottomSheet : Modal;

  return (
    <SheetComponent isOpen={isOpen} onClose={onClose} title="Your Rewards" size="md">
      <div className="space-y-6">
        {/* Success State */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-mantle-success/10 rounded-xl border border-mantle-success/30"
          >
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-mantle-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-mantle-success mb-1">Rewards Claimed!</p>
                <p className="text-body-sm text-mantle-text-secondary">
                  Your rewards have been sent to your wallet.
                </p>
                {hash && (
                  <a
                    href={`https://sepolia.mantlescan.xyz/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-mantle-accent text-sm mt-2 hover:underline"
                  >
                    View transaction
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Identity Section */}
        <div className="p-4 bg-mantle-bg-secondary rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-mantle-accent/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-mantle-accent" />
            </div>
            <div>
              <h3 className="text-body-md font-medium text-mantle-text-primary">Reporter Identity</h3>
              <p className="text-label-md text-mantle-text-tertiary">
                {identity ? "Active" : "Not configured"}
              </p>
            </div>
          </div>

          {identity ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-mantle-success text-sm">
                <Check className="w-4 h-4" />
                Identity loaded
              </div>
              <div className="p-3 bg-mantle-bg-tertiary rounded-lg">
                <p className="text-label-sm text-mantle-text-tertiary mb-1">Commitment</p>
                <p className="text-xs font-mono text-mantle-text-secondary break-all">
                  {identity.commitment}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearIdentity}
                className="text-mantle-error"
              >
                <Trash2 className="w-4 h-4" />
                Clear Identity
              </Button>
            </div>
          ) : showRecoverInput ? (
            <div className="space-y-4">
              <p className="text-body-sm text-mantle-text-secondary">
                Enter your passphrase to recover your identity and access pending rewards.
              </p>
              <Input
                type="password"
                placeholder="Enter your passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowRecoverInput(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleRecover} disabled={passphrase.length < 8} className="flex-1">
                  Recover
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-body-sm text-mantle-text-secondary">
                No identity found. Recover your identity to access pending rewards.
              </p>
              <Button variant="secondary" fullWidth onClick={() => setShowRecoverInput(true)}>
                Recover Identity
              </Button>
            </div>
          )}
        </div>

        {/* Rewards Display */}
        {identity && (
          <>
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <Gift className="w-6 h-6 text-mantle-accent" />
                <span className="text-label-lg text-mantle-text-tertiary">Pending Rewards</span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-display-sm font-bold gradient-text">{formattedRewards}</span>
                <span className="text-headline-sm text-mantle-text-secondary">MNT</span>
              </div>
              <p className="text-label-md text-mantle-text-tertiary mt-2">
                From confirmed reports + tips
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-mantle-error/10 rounded-xl border border-mantle-error/30 flex gap-3">
                <AlertCircle className="w-5 h-5 text-mantle-error flex-shrink-0" />
                <p className="text-body-sm text-mantle-error">{error.message}</p>
              </div>
            )}

            {/* Claim Button */}
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleClaim}
              disabled={!hasRewards || isPending || isConfirming}
              loading={isPending || isConfirming}
            >
              {!hasRewards ? "No Rewards to Claim" : "Claim Rewards"}
            </Button>
          </>
        )}

        {/* How It Works */}
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-label-lg font-medium text-mantle-text-secondary mb-4">
            How Rewards Work
          </h4>
          <div className="space-y-4">
            {[
              {
                icon: Wallet,
                title: "Submit Report",
                description: "Stake MNT to show confidence in your report",
              },
              {
                icon: Check,
                title: "Get Confirmed",
                description: "3+ confirmations returns your stake",
              },
              {
                icon: Gift,
                title: "Receive Regards",
                description: "Grateful users can tip you",
              },
              {
                icon: TrendingUp,
                title: "Claim Anytime",
                description: "Use your passphrase to claim",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-mantle-accent/10 flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-4 h-4 text-mantle-accent" />
                </div>
                <div>
                  <p className="text-body-sm font-medium text-mantle-text-primary">{step.title}</p>
                  <p className="text-label-md text-mantle-text-tertiary">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SheetComponent>
  );
}
