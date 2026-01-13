"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  useSubmitReport,
  useReporterIdentity,
  generateCommitment,
} from "@/hooks/useRoadGuard";
import { EventTypeLabels, EventType } from "@/lib/contracts/RoadGuardABI";
import { MIN_STAKE } from "@/lib/wagmi";

interface ReportPanelProps {
  selectedLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number) => void;
}

export function ReportPanel({ selectedLocation, onClose, onLocationSelect }: ReportPanelProps) {
  const { address, isConnected } = useAccount();
  const { identity, createIdentity, loadIdentity } = useReporterIdentity();
  const { submitReport, isPending, isConfirming, isSuccess, error, hash } = useSubmitReport();

  const [eventType, setEventType] = useState<EventType>(0);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(formatEther(MIN_STAKE));

  // Load existing identity on mount
  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const handleCreateIdentity = () => {
    if (passphrase.length < 8) {
      alert("Passphrase must be at least 8 characters");
      return;
    }
    createIdentity(passphrase);
    setShowPassphraseInput(false);
    setPassphrase("");
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      alert("Please select a location on the map");
      return;
    }

    if (!identity) {
      setShowPassphraseInput(true);
      return;
    }

    try {
      await submitReport({
        commitment: identity.commitment,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        eventType,
        stakeAmount: parseEther(stakeAmount),
      });
    } catch (e) {
      console.error("Submit error:", e);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6">
        <button onClick={onClose} className="text-gray-400 hover:text-white mb-4">
          &larr; Back
        </button>
        <div className="text-center py-12">
          <p className="text-gray-400">Please connect your wallet to submit reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Submit Report</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
          &times;
        </button>
      </div>

      {/* Success State */}
      {isSuccess && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-400 mb-2">Report Submitted!</h3>
          <p className="text-sm text-gray-300 mb-2">
            Your report has been submitted to the blockchain.
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
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
            <p className="text-xs text-yellow-300">
              <strong>IMPORTANT:</strong> Save your passphrase securely! You&apos;ll need it to
              claim rewards. Without it, your rewards are lost forever.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Identity Section */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-mantle-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="font-semibold">Privacy Shield</h3>
        </div>

        {identity ? (
          <div className="text-sm">
            <p className="text-green-400 mb-1">Identity active</p>
            <p className="text-gray-400 text-xs font-mono break-all">
              Commitment: {identity.commitment.slice(0, 18)}...
            </p>
          </div>
        ) : showPassphraseInput ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Create a secret passphrase to protect your identity. This generates a cryptographic
              commitment that hides your wallet address.
            </p>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter secret passphrase (min 8 chars)"
              className="input w-full"
            />
            <button onClick={handleCreateIdentity} className="btn-primary w-full">
              Create Anonymous Identity
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-2">
              No identity found. Create one to submit reports anonymously.
            </p>
            <button
              onClick={() => setShowPassphraseInput(true)}
              className="btn-secondary w-full"
            >
              Set Up Privacy Shield
            </button>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="card mb-4">
        <h3 className="font-semibold mb-2">Location</h3>
        {selectedLocation ? (
          <div className="text-sm">
            <p className="text-mantle-accent">
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
            <p className="text-gray-400 text-xs mt-1">Click on the map to change location</p>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Click on the map to select a location</p>
        )}
      </div>

      {/* Event Type */}
      <div className="card mb-4">
        <h3 className="font-semibold mb-3">Event Type</h3>
        <div className="grid grid-cols-2 gap-2">
          {EventTypeLabels.map((label, index) => (
            <button
              key={label}
              onClick={() => setEventType(index as EventType)}
              className={`p-3 rounded-lg text-sm text-left transition-all ${
                eventType === index
                  ? "bg-mantle-accent text-black font-semibold"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stake Amount */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-2">Stake Amount</h3>
        <p className="text-xs text-gray-400 mb-2">
          Stake is returned when your report is confirmed. Higher stakes show confidence.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            min={formatEther(MIN_STAKE)}
            step="0.001"
            className="input flex-1"
          />
          <span className="text-gray-400">MNT</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Minimum: {formatEther(MIN_STAKE)} MNT
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-300">{error.message}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isPending || isConfirming || !selectedLocation || !identity}
        className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending
          ? "Confirm in Wallet..."
          : isConfirming
          ? "Submitting..."
          : "Submit Report"}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Your wallet address is never stored. Only the commitment hash goes on-chain.
      </p>
    </div>
  );
}
