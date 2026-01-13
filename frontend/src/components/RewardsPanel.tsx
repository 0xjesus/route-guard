"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import {
  usePendingRewards,
  useClaimRewards,
  useReporterIdentity,
} from "@/hooks/useRoadGuard";

interface RewardsPanelProps {
  onClose: () => void;
}

export function RewardsPanel({ onClose }: RewardsPanelProps) {
  const { address, isConnected } = useAccount();
  const { identity, loadIdentity, createIdentity, clearIdentity } = useReporterIdentity();
  const { data: pendingRewards } = usePendingRewards(identity?.commitment);
  const { claimRewards, isPending, isConfirming, isSuccess, error, hash } = useClaimRewards();

  const [passphrase, setPassphrase] = useState("");
  const [showRecoverInput, setShowRecoverInput] = useState(false);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const handleClaim = async () => {
    if (!identity || !address) return;

    try {
      await claimRewards(identity.secret, address);
    } catch (e) {
      console.error("Claim error:", e);
    }
  };

  const handleRecover = () => {
    if (passphrase.length < 8) {
      alert("Passphrase must be at least 8 characters");
      return;
    }
    createIdentity(passphrase);
    setShowRecoverInput(false);
    setPassphrase("");
  };

  const formattedRewards = pendingRewards ? formatEther(pendingRewards) : "0";
  const hasRewards = pendingRewards && pendingRewards > BigInt(0);

  if (!isConnected) {
    return (
      <div className="p-6">
        <button onClick={onClose} className="text-gray-400 hover:text-white mb-4">
          &larr; Back
        </button>
        <div className="text-center py-12">
          <p className="text-gray-400">Please connect your wallet to view rewards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Your Rewards</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
          &times;
        </button>
      </div>

      {/* Success State */}
      {isSuccess && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-400 mb-2">Rewards Claimed!</h3>
          <p className="text-sm text-gray-300 mb-2">
            Your rewards have been sent to your wallet.
          </p>
          {hash && (
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mantle-accent text-sm hover:underline"
            >
              View on Explorer &rarr;
            </a>
          )}
        </div>
      )}

      {/* Identity Status */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-mantle-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h3 className="font-semibold">Reporter Identity</h3>
        </div>

        {identity ? (
          <div>
            <p className="text-green-400 text-sm mb-2">Identity loaded</p>
            <p className="text-xs text-gray-400 font-mono break-all mb-3">
              {identity.commitment}
            </p>
            <button
              onClick={clearIdentity}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear Identity
            </button>
          </div>
        ) : showRecoverInput ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Enter your passphrase to recover your reporting identity and access pending rewards.
            </p>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter your passphrase"
              className="input w-full"
            />
            <div className="flex gap-2">
              <button onClick={handleRecover} className="btn-primary flex-1">
                Recover
              </button>
              <button
                onClick={() => setShowRecoverInput(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              No identity found. If you&apos;ve submitted reports before, recover your identity using
              your passphrase.
            </p>
            <button
              onClick={() => setShowRecoverInput(true)}
              className="btn-secondary w-full"
            >
              Recover Identity
            </button>
          </div>
        )}
      </div>

      {/* Rewards Display */}
      {identity && (
        <>
          <div className="card mb-6">
            <h3 className="text-sm text-gray-400 mb-1">Pending Rewards</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-mantle-accent">{formattedRewards}</span>
              <span className="text-xl text-gray-400 mb-1">MNT</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Includes confirmed report stakes + tips from grateful users
            </p>
          </div>

          {/* Claim Button */}
          <button
            onClick={handleClaim}
            disabled={!hasRewards || isPending || isConfirming}
            className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
              ? "Processing..."
              : hasRewards
              ? "Claim Rewards"
              : "No Rewards to Claim"}
          </button>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-300">{error.message}</p>
            </div>
          )}
        </>
      )}

      {/* How It Works */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <h3 className="font-semibold mb-4">How Rewards Work</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-mantle-accent flex items-center justify-center text-black text-sm font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300">Submit a report with a stake</p>
              <p className="text-xs text-gray-500">Your stake shows you&apos;re confident in your report</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-mantle-accent flex items-center justify-center text-black text-sm font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300">Community confirms your report</p>
              <p className="text-xs text-gray-500">3 confirmations returns your stake</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-mantle-accent flex items-center justify-center text-black text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300">Receive &ldquo;tips&rdquo; from grateful users</p>
              <p className="text-xs text-gray-500">Users who found your report helpful can tip you</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-mantle-accent flex items-center justify-center text-black text-sm font-bold">
              4
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300">Claim anytime using your passphrase</p>
              <p className="text-xs text-gray-500">Your identity stays hidden from the blockchain</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
