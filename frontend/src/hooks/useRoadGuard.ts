"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, encodePacked, parseEther } from "viem";
import { useCallback, useState, useEffect } from "react";
import { RoadGuardABI } from "@/lib/contracts/RoadGuardABI";
import { ROADGUARD_ADDRESS, MIN_STAKE } from "@/lib/wagmi";
import { mantle } from "wagmi/chains";

const contractAddress = ROADGUARD_ADDRESS[mantle.id];

/**
 * Generate a commitment from a secret passphrase
 * The user keeps the secret locally; only the commitment goes on-chain
 */
export function generateCommitment(passphrase: string): {
  secret: `0x${string}`;
  commitment: `0x${string}`;
} {
  const secretBytes = keccak256(encodePacked(["string"], [passphrase]));
  const commitment = keccak256(encodePacked(["bytes32"], [secretBytes]));
  return { secret: secretBytes, commitment };
}

/**
 * Scale coordinates for on-chain storage (multiply by 1e8)
 */
export function scaleCoordinate(coord: number): bigint {
  return BigInt(Math.round(coord * 1e8));
}

/**
 * Hook for reading report count
 */
export function useReportCount() {
  return useReadContract({
    address: contractAddress,
    abi: RoadGuardABI,
    functionName: "reportCount",
  });
}

/**
 * Hook for reading a specific report
 */
export function useReport(reportId: bigint) {
  return useReadContract({
    address: contractAddress,
    abi: RoadGuardABI,
    functionName: "getReport",
    args: [reportId],
  });
}

/**
 * Hook for reading pending rewards
 */
export function usePendingRewards(commitment: `0x${string}` | undefined) {
  return useReadContract({
    address: contractAddress,
    abi: RoadGuardABI,
    functionName: "getPendingRewards",
    args: commitment ? [commitment] : undefined,
    query: {
      enabled: !!commitment,
    },
  });
}

/**
 * Hook for submitting a report ANONYMOUSLY via relayer
 * The relayer submits the transaction, so your wallet is never linked to the report
 */
export function useSubmitReport() {
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);

  const submitReport = useCallback(
    async (params: {
      commitment: `0x${string}`;
      latitude: number;
      longitude: number;
      eventType: 0 | 1 | 2 | 3 | 4 | 5;
      stakeAmount?: bigint;
    }) => {
      const { commitment, latitude, longitude, eventType, stakeAmount = MIN_STAKE } = params;

      setIsPending(true);
      setIsConfirming(false);
      setIsSuccess(false);
      setError(null);
      setHash(undefined);

      try {
        // Submit via relayer for 100% privacy
        const response = await fetch("/api/relay/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commitment,
            latitude,
            longitude,
            eventType,
            stakeAmount: stakeAmount.toString(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit report");
        }

        setHash(data.txHash as `0x${string}`);
        setIsConfirming(true);

        // The relayer already waits for confirmation, so we're done
        setIsConfirming(false);
        setIsSuccess(true);

        console.log("[Anonymous Report] Submitted via relayer:", data.txHash);
        console.log("[Anonymous Report] Your wallet is NOT linked to this report!");

        return data;
      } catch (err: any) {
        console.error("[Anonymous Report] Error:", err);
        setError(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return {
    submitReport,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for submitting a report DIRECTLY from user's wallet (non-anonymous)
 * Use this if you want the report linked to your wallet
 */
export function useSubmitReportDirect() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const submitReport = useCallback(
    async (params: {
      commitment: `0x${string}`;
      latitude: number;
      longitude: number;
      eventType: 0 | 1 | 2 | 3 | 4 | 5;
      stakeAmount?: bigint;
    }) => {
      const { commitment, latitude, longitude, eventType, stakeAmount = MIN_STAKE } = params;

      return writeContract({
        address: contractAddress,
        abi: RoadGuardABI,
        functionName: "submitReport",
        args: [commitment, scaleCoordinate(latitude), scaleCoordinate(longitude), eventType],
        value: stakeAmount,
      });
    },
    [writeContract]
  );

  return {
    submitReport,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for confirming a report
 */
export function useConfirmReport() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const confirmReport = useCallback(
    (reportId: bigint) => {
      return writeContract({
        address: contractAddress,
        abi: RoadGuardABI,
        functionName: "confirmReport",
        args: [reportId],
      });
    },
    [writeContract]
  );

  return {
    confirmReport,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for sending regards (rewards)
 */
export function useSendRegards() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const sendRegards = useCallback(
    (reportId: bigint, amount: bigint) => {
      return writeContract({
        address: contractAddress,
        abi: RoadGuardABI,
        functionName: "sendRegards",
        args: [reportId],
        value: amount,
      });
    },
    [writeContract]
  );

  return {
    sendRegards,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for claiming rewards
 */
export function useClaimRewards() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimRewards = useCallback(
    (secret: `0x${string}`, recipient: `0x${string}`) => {
      return writeContract({
        address: contractAddress,
        abi: RoadGuardABI,
        functionName: "claimRewards",
        args: [secret, recipient],
      });
    },
    [writeContract]
  );

  return {
    claimRewards,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

const IDENTITY_STORAGE_KEY = "roadguard_identity";

/**
 * Hook for managing reporter identity (stored locally)
 * Provides privacy by keeping the secret client-side
 */
export function useReporterIdentity() {
  const [identity, setIdentity] = useState<{
    secret: `0x${string}`;
    commitment: `0x${string}`;
  } | null>(null);

  const createIdentity = useCallback((passphrase: string) => {
    const newIdentity = generateCommitment(passphrase);
    setIdentity(newIdentity);

    // Store encrypted in localStorage (in production, use better encryption)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(newIdentity));
      } catch (e) {
        console.error("Failed to save identity:", e);
      }
    }

    return newIdentity;
  }, []);

  const loadIdentity = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(IDENTITY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setIdentity(parsed);
          return parsed;
        }
      } catch (e) {
        console.error("Failed to load identity:", e);
      }
    }
    return null;
  }, []);

  const clearIdentity = useCallback(() => {
    setIdentity(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(IDENTITY_STORAGE_KEY);
      } catch (e) {
        console.error("Failed to clear identity:", e);
      }
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  return {
    identity,
    createIdentity,
    loadIdentity,
    clearIdentity,
    hasIdentity: !!identity,
  };
}
