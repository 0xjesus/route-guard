export const RoadGuardABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitReport",
    inputs: [
      { name: "_commitment", type: "bytes32", internalType: "bytes32" },
      { name: "_latitude", type: "int64", internalType: "int64" },
      { name: "_longitude", type: "int64", internalType: "int64" },
      { name: "_eventType", type: "uint8", internalType: "enum RoadGuard.EventType" },
    ],
    outputs: [{ name: "reportId", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "confirmReport",
    inputs: [{ name: "_reportId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sendRegards",
    inputs: [{ name: "_reportId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claimRewards",
    inputs: [
      { name: "_secret", type: "bytes32", internalType: "bytes32" },
      { name: "_recipient", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getReport",
    inputs: [{ name: "_reportId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct RoadGuard.Report",
        components: [
          { name: "reporterCommitment", type: "bytes32", internalType: "bytes32" },
          { name: "latitude", type: "int64", internalType: "int64" },
          { name: "longitude", type: "int64", internalType: "int64" },
          { name: "eventType", type: "uint8", internalType: "enum RoadGuard.EventType" },
          { name: "status", type: "uint8", internalType: "enum RoadGuard.ReportStatus" },
          { name: "timestamp", type: "uint64", internalType: "uint64" },
          { name: "expiresAt", type: "uint64", internalType: "uint64" },
          { name: "stakeAmount", type: "uint128", internalType: "uint128" },
          { name: "totalRegards", type: "uint128", internalType: "uint128" },
          { name: "confirmationCount", type: "uint32", internalType: "uint32" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPendingRewards",
    inputs: [{ name: "_commitment", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reportCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minStake",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ReportSubmitted",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "reporterCommitment", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "latitude", type: "int64", indexed: false, internalType: "int64" },
      { name: "longitude", type: "int64", indexed: false, internalType: "int64" },
      { name: "eventType", type: "uint8", indexed: false, internalType: "enum RoadGuard.EventType" },
      { name: "stake", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "expiresAt", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReportConfirmed",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "confirmer", type: "address", indexed: true, internalType: "address" },
      { name: "newConfirmationCount", type: "uint32", indexed: false, internalType: "uint32" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RegardsSent",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "sender", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RewardsClaimed",
    inputs: [
      { name: "commitment", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "recipient", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

export const EventTypeLabels = [
  "Accident",
  "Road Closure",
  "Protest",
  "Police Activity",
  "Hazard",
  "Traffic Jam",
] as const;

export type EventType = 0 | 1 | 2 | 3 | 4 | 5;

export const EventTypeColors: Record<EventType, string> = {
  0: "#ef4444", // Accident - red
  1: "#f97316", // Road Closure - orange
  2: "#a855f7", // Protest - purple
  3: "#3b82f6", // Police - blue
  4: "#eab308", // Hazard - yellow
  5: "#6b7280", // Traffic - gray
};
