import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantle } from "viem/chains";

// RoadGuard contract ABI (only submitReport function)
const ROADGUARD_ABI = [
  {
    inputs: [
      { name: "_commitment", type: "bytes32" },
      { name: "_latitude", type: "int64" },
      { name: "_longitude", type: "int64" },
      { name: "_eventType", type: "uint8" },
    ],
    name: "submitReport",
    outputs: [{ name: "reportId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Contract address on Mantle Mainnet
const ROADGUARD_ADDRESS = "0x23a95d01af99F06c446522765E6F3E604865D58a";

// Minimum stake
const MIN_STAKE = parseEther("0.001");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commitment, latitude, longitude, eventType, stakeAmount } = body;

    // Validate inputs
    if (!commitment || typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: commitment, latitude, longitude" },
        { status: 400 }
      );
    }

    if (eventType < 0 || eventType > 5) {
      return NextResponse.json(
        { error: "Invalid eventType. Must be 0-5" },
        { status: 400 }
      );
    }

    // Get relayer private key from environment
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKey) {
      console.error("RELAYER_PRIVATE_KEY not configured");
      return NextResponse.json(
        { error: "Relayer not configured" },
        { status: 500 }
      );
    }

    // Create relayer account
    const account = privateKeyToAccount(relayerPrivateKey as `0x${string}`);

    // Create clients
    const publicClient = createPublicClient({
      chain: mantle,
      transport: http("https://rpc.mantle.xyz"),
    });

    const walletClient = createWalletClient({
      account,
      chain: mantle,
      transport: http("https://rpc.mantle.xyz"),
    });

    // Check relayer balance
    const balance = await publicClient.getBalance({ address: account.address });
    const stake = stakeAmount ? BigInt(stakeAmount) : MIN_STAKE;

    // Need stake + gas buffer (~0.01 MNT for gas)
    const requiredBalance = stake + parseEther("0.01");
    if (balance < requiredBalance) {
      console.error(`Relayer balance too low: ${balance} < ${requiredBalance}`);
      return NextResponse.json(
        { error: "Relayer has insufficient funds. Please try again later." },
        { status: 503 }
      );
    }

    // Convert lat/lng to int64 scaled by 1e8
    const latScaled = BigInt(Math.round(latitude * 1e8));
    const lngScaled = BigInt(Math.round(longitude * 1e8));

    // Submit report via relayer
    const hash = await walletClient.writeContract({
      address: ROADGUARD_ADDRESS,
      abi: ROADGUARD_ABI,
      functionName: "submitReport",
      args: [commitment as `0x${string}`, latScaled, lngScaled, eventType],
      value: stake,
    });

    console.log(`[Relayer] Submitted report. TX: ${hash}`);
    console.log(`[Relayer] Commitment: ${commitment}`);
    console.log(`[Relayer] Location: ${latitude}, ${longitude}`);
    console.log(`[Relayer] Stake: ${stake}`);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      relayerAddress: account.address,
      message: "Report submitted anonymously via relayer",
    });

  } catch (error: any) {
    console.error("[Relayer] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to relay transaction" },
      { status: 500 }
    );
  }
}

// GET endpoint to check relayer status
export async function GET() {
  try {
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKey) {
      return NextResponse.json({
        status: "not_configured",
        message: "Relayer private key not set",
      });
    }

    const account = privateKeyToAccount(relayerPrivateKey as `0x${string}`);

    const publicClient = createPublicClient({
      chain: mantle,
      transport: http("https://rpc.mantle.xyz"),
    });

    const balance = await publicClient.getBalance({ address: account.address });

    return NextResponse.json({
      status: "active",
      relayerAddress: account.address,
      balance: balance.toString(),
      balanceFormatted: (Number(balance) / 1e18).toFixed(4) + " MNT",
      minStake: "0.001 MNT",
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
    });
  }
}
