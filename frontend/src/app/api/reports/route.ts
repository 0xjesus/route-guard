import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reportsCache } from "@/lib/schema";
import { sql, and, gte, lte, eq, desc } from "drizzle-orm";
import { createPublicClient, http } from "viem";
import { mantle } from "viem/chains";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ROADGUARD_ADDRESS as `0x${string}`;

const CONTRACT_ABI = [
  {
    name: "reportCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getReport",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_reportId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "reporterCommitment", type: "bytes32" },
          { name: "latitude", type: "int64" },
          { name: "longitude", type: "int64" },
          { name: "eventType", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "timestamp", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "stakeAmount", type: "uint128" },
          { name: "totalRegards", type: "uint128" },
          { name: "confirmationCount", type: "uint32" },
        ],
      },
    ],
  },
  {
    name: "ReportSubmitted",
    type: "event",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "latitude", type: "int64", indexed: false },
      { name: "longitude", type: "int64", indexed: false },
      { name: "eventType", type: "uint8", indexed: false },
    ],
  },
] as const;

async function fetchReportsFromChain(lat: number, lng: number, radius: number, limit: number) {
  if (!CONTRACT_ADDRESS) {
    throw new Error("No contract address configured");
  }

  const client = createPublicClient({
    chain: mantle,
    transport: http("https://rpc.mantle.xyz"),
  });

  const count = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "reportCount",
  });
  const totalReports = Number(count);

  if (totalReports === 0) {
    return [];
  }

  // Fetch event logs to get transaction hashes from Mantlescan API
  // (RPC getLogs has issues with large block ranges)
  const txHashMap: Record<number, string> = {};
  try {
    const response = await fetch(
      `https://explorer.mantle.xyz/api/v2/addresses/${CONTRACT_ADDRESS}/logs`
    );
    if (response.ok) {
      const data = await response.json();
      for (const log of data.items || []) {
        // topics[1] contains the indexed reportId
        if (log.topics && log.topics[1]) {
          const reportId = parseInt(log.topics[1], 16);
          txHashMap[reportId] = log.tx_hash;
        }
      }
    }
  } catch (e) {
    console.warn("Could not fetch event logs from explorer:", e);
  }

  // Fetch all reports
  const reports = [];
  const latDelta = radius / 111;
  const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i < totalReports && reports.length < limit; i++) {
    try {
      const report = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getReport",
        args: [BigInt(i)],
      });

      const reportLat = Number(report.latitude) / 1e8;
      const reportLng = Number(report.longitude) / 1e8;

      // Filter by bounding box and status only (no expiration filter - show all reports)
      if (
        reportLat >= lat - latDelta &&
        reportLat <= lat + latDelta &&
        reportLng >= lng - lngDelta &&
        reportLng <= lng + lngDelta &&
        (report.status === 0 || report.status === 1) // active or confirmed
      ) {
        reports.push({
          id: i,
          lat: reportLat,
          lng: reportLng,
          eventType: report.eventType,
          status: report.status,
          confirmationCount: report.confirmationCount,
          totalRegards: Number(report.totalRegards),
          stakeAmount: Number(report.stakeAmount) / 1e18,
          commitment: report.reporterCommitment,
          txHash: txHashMap[i] || null,
          timestamp: Number(report.timestamp),
          expiresAt: Number(report.expiresAt),
        });
      }
    } catch {
      // Skip failed reads
    }
  }

  return reports;
}

/**
 * GET /api/reports
 * Fetch reports within a geographic bounding box or radius
 *
 * Query params:
 * - lat: center latitude
 * - lng: center longitude
 * - radius: radius in km (default 10)
 * - status: filter by status (0=active, 1=confirmed, 2=expired, 3=slashed)
 * - eventType: filter by event type (0-5)
 * - limit: max results (default 100)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseFloat(searchParams.get("radius") || "10");
  const limit = parseInt(searchParams.get("limit") || "100");

  // If no database configured, fetch directly from blockchain
  if (!db) {
    try {
      const reports = await fetchReportsFromChain(lat, lng, radius, limit);
      return NextResponse.json({
        reports: reports || [],
        count: reports?.length || 0,
        source: "blockchain",
      });
    } catch (error) {
      console.error("Error fetching from chain:", error);
      return NextResponse.json({
        reports: [],
        count: 0,
        source: "blockchain",
        error: "Failed to fetch from chain",
      });
    }
  }

  try {
    const status = searchParams.get("status");
    const eventType = searchParams.get("eventType");

    // Convert radius to approximate degree offset
    // 1 degree latitude ≈ 111 km
    // 1 degree longitude varies by latitude, but we'll approximate
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

    const minLat = (lat - latDelta).toFixed(8);
    const maxLat = (lat + latDelta).toFixed(8);
    const minLng = (lng - lngDelta).toFixed(8);
    const maxLng = (lng + lngDelta).toFixed(8);

    // Build conditions - include reports expired within last 24 hours for demo
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const conditions = [
      gte(reportsCache.locationLat, minLat),
      lte(reportsCache.locationLat, maxLat),
      gte(reportsCache.locationLng, minLng),
      lte(reportsCache.locationLng, maxLng),
      gte(reportsCache.expiresAt, oneDayAgo), // Include recently expired
    ];

    // Filter by status if provided
    if (status !== null && status !== undefined && status !== "") {
      conditions.push(eq(reportsCache.status, parseInt(status)));
    } else {
      // Default to active and confirmed reports only
      conditions.push(
        sql`${reportsCache.status} IN (0, 1)`
      );
    }

    // Filter by event type if provided
    if (eventType !== null && eventType !== undefined && eventType !== "") {
      conditions.push(eq(reportsCache.eventType, parseInt(eventType)));
    }

    const reports = await db
      .select({
        id: reportsCache.chainReportId,
        lat: reportsCache.locationLat,
        lng: reportsCache.locationLng,
        eventType: reportsCache.eventType,
        status: reportsCache.status,
        confirmationCount: reportsCache.confirmationCount,
        totalRegards: reportsCache.totalRegards,
        timestamp: reportsCache.createdAt,
        expiresAt: reportsCache.expiresAt,
      })
      .from(reportsCache)
      .where(and(...conditions))
      .orderBy(desc(reportsCache.createdAt))
      .limit(limit);

    // Transform for frontend
    const transformedReports = reports.map((r) => ({
      id: r.id,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      eventType: r.eventType,
      status: r.status,
      confirmationCount: r.confirmationCount,
      totalRegards: r.totalRegards,
      timestamp: Math.floor(new Date(r.timestamp).getTime() / 1000),
      expiresAt: Math.floor(new Date(r.expiresAt).getTime() / 1000),
    }));

    return NextResponse.json({
      reports: transformedReports,
      count: transformedReports.length,
      bounds: { minLat, maxLat, minLng, maxLng },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);

    // Return empty array for demo purposes if DB isn't connected
    return NextResponse.json({
      reports: [],
      count: 0,
      error: "Database error",
    });
  }
}

/**
 * POST /api/reports/index
 * Called by the indexer to add a new report from on-chain events
 * (In production, this would be authenticated/internal only)
 */
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const {
      chainReportId,
      reporterCommitment,
      latitude,
      longitude,
      eventType,
      expiresAt,
      txHash,
    } = body;

    await db.insert(reportsCache).values({
      chainReportId,
      reporterCommitment,
      locationLat: (latitude / 1e8).toFixed(8),
      locationLng: (longitude / 1e8).toFixed(8),
      eventType,
      status: 0, // active
      expiresAt: new Date(expiresAt * 1000),
      txHash,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error indexing report:", error);
    return NextResponse.json(
      { error: "Failed to index report" },
      { status: 500 }
    );
  }
}
