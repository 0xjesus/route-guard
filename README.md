# RoadGuard - Route Guard

> **100% Anonymous Road Incident Reporting on Mantle**
>
> Built for Mantle Global Hackathon 2025 | ZK & Privacy + GameFi & Social Tracks

![Mantle](https://img.shields.io/badge/Mantle-L2-65B3AE?style=for-the-badge)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge)

**Live Demo**: [route-guard.vercel.app](https://frontend-0xjesus-projects-7a9bb427.vercel.app)

---

## The Problem

Current road incident reporting apps (Waze, Google Maps) expose user identity:

- **Privacy Risk**: Reporters of protests, police activity, or accidents can be identified and targeted
- **No Incentives**: Users report for free with no reward for accuracy
- **Centralized Control**: Platforms can be forced to reveal user data
- **Wallet Exposure**: Even "decentralized" solutions link your wallet to your reports

## The Solution: 100% Anonymous Reporting

**RoadGuard** uses a **Relayer + Commit-Reveal** architecture to achieve **complete anonymity**:

```
Traditional dApp:          RoadGuard:

User Wallet ──────────►    User ──► Relayer API ──► Relayer Wallet ──►
     │                                                    │
     ▼                                                    ▼
 Blockchain                                          Blockchain
     │                                                    │
     ▼                                                    ▼
 YOUR WALLET                                      RELAYER WALLET
 IS VISIBLE!                                    (User is HIDDEN!)
```

---

## Privacy Architecture

### The Two-Layer Privacy System

| Layer | Mechanism | What it Hides |
|-------|-----------|---------------|
| **Layer 1: Relayer API** | Server submits transactions | Hides WHO submitted the report |
| **Layer 2: Commit-Reveal** | Cryptographic proof | Proves WHO can claim rewards |

### How It Works

#### Step 1: User Creates Report
```typescript
// User generates a secret passphrase locally
const passphrase = "my-secret-phrase-123";

// Generate cryptographic commitment
const secret = keccak256(passphrase);        // First hash
const commitment = keccak256(secret);         // Second hash (goes on-chain)

// The passphrase stays on user's device
// Only the commitment is sent to blockchain
```

#### Step 2: Relayer Submits to Blockchain
```typescript
// User sends report to our API (NOT directly to blockchain)
POST /api/relay/report
{
  commitment: "0xabc...",  // Cryptographic commitment
  latitude: 19.4326,
  longitude: -99.1332,
  eventType: 0  // Accident
}

// The RELAYER's wallet submits the transaction
// User's wallet NEVER touches the blockchain
```

#### Step 3: On-Chain Record
```solidity
// What appears on blockchain:
Transaction {
  from: 0xD6F44...  // RELAYER wallet (not user!)
  to: RoadGuard Contract
  data: submitReport(commitment, lat, lng, type)
}

// The commitment is just a hash - no way to identify the user
```

#### Step 4: Claiming Rewards
```typescript
// When user wants to claim rewards, they reveal the secret
claimRewards(secret, recipientAddress);

// Contract verifies: keccak256(secret) == commitment
// Only the original reporter knows the secret!
```

### Visual Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANONYMOUS REPORTING FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   USER'S DEVICE                    RELAYER                  BLOCKCHAIN      │
│   ─────────────                    ───────                  ──────────      │
│                                                                             │
│   1. Generate passphrase                                                    │
│      "my-secret-123"                                                        │
│            │                                                                │
│            ▼                                                                │
│   2. Create commitment                                                      │
│      commitment = hash(hash(passphrase))                                    │
│            │                                                                │
│            ▼                                                                │
│   3. Send to Relayer API ──────────► 4. Relayer receives                   │
│      (via HTTPS)                        commitment + location               │
│                                              │                              │
│                                              ▼                              │
│                                    5. Relayer submits ─────► 6. On-chain:  │
│                                       with ITS wallet         from: Relayer│
│                                       (pays gas + stake)      commitment: X │
│                                                                             │
│   ═══════════════════════════════════════════════════════════════════════  │
│                                                                             │
│   LATER: Claiming Rewards                                                   │
│   ───────────────────────                                                   │
│                                                                             │
│   7. User reveals passphrase ──────────────────────────────► 8. Contract   │
│      to claim rewards                                           verifies:  │
│      claimRewards(secret, myWallet)                            hash(secret)│
│                                                                 == stored  │
│                                                                 commitment │
│                                                                     │      │
│                                                                     ▼      │
│                                                              9. Rewards    │
│                                                                 sent to    │
│                                                                 myWallet   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Security Properties

| Property | Guarantee |
|----------|-----------|
| **Reporter Anonymity** | User's wallet never appears on-chain |
| **Trustless Rewards** | Relayer cannot steal rewards (doesn't know passphrase) |
| **Censorship Resistant** | Multiple relayers can be deployed |
| **Verifiable** | Anyone can verify commitment matches secret |

### What Can Be Seen On-Chain?

| Data | Visible? | Who Can See |
|------|----------|-------------|
| Report location | Yes | Everyone |
| Report type | Yes | Everyone |
| Commitment hash | Yes | Everyone (but meaningless without secret) |
| Reporter's wallet | **NO** | Only relayer wallet visible |
| Passphrase/Secret | **NO** | Only on user's device |
| Reward recipient | Yes | Only when claimed |

---

## Features

### Route Planning with Hazard Detection
- Enter origin and destination
- Get multiple route options
- See hazards within **500 meters** of each route
- One-click navigation to Google Maps

### Anonymous Reporting
- Report incidents without revealing your identity
- Stake 0.001 MNT (refunded on community confirmation)
- Earn "regards" tips from grateful users

### Community Validation
- Confirm reports you've witnessed
- Help maintain report accuracy
- Slash false reports

---

## Tech Stack

### Frontend
- **Next.js 15** - App Router + Server Components
- **Google Maps API** - Custom dark theme + Places Autocomplete
- **wagmi/viem** - Web3 integration
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling

### Backend
- **Relayer API** - Next.js API Routes
- **viem** - Blockchain interaction from server

### Smart Contracts
- **Solidity 0.8.24** - Foundry framework
- **Mantle L2** - Low gas fees (~$0.01)

---

## Smart Contract

**Deployed on Mantle Mainnet**: `0x23a95d01af99F06c446522765E6F3E604865D58a`

```solidity
// Submit anonymous report (called by relayer)
function submitReport(
    bytes32 commitment,    // keccak256(keccak256(passphrase))
    int64 latitude,        // Scaled by 1e8
    int64 longitude,
    EventType eventType
) external payable returns (uint256 reportId);

// Confirm a report (community validation)
function confirmReport(uint256 reportId) external;

// Send regards (tip the reporter)
function sendRegards(uint256 reportId) external payable;

// Claim rewards with passphrase
function claimRewards(bytes32 secret, address recipient) external;
```

---

## Event Types

| ID | Type | Icon | Use Case |
|----|------|------|----------|
| 0 | Accident | 🚗 | Vehicle collisions |
| 1 | Road Closure | 🚧 | Construction, events |
| 2 | Protest | 📢 | Demonstrations |
| 3 | Police Activity | 🚔 | Checkpoints |
| 4 | Hazard | ⚠️ | Debris, conditions |
| 5 | Traffic Jam | 🔥 | Congestion |

---

## Quick Start

```bash
# Install dependencies
cd frontend && npm install

# Configure environment
cp .env.example .env.local
# Add your API keys:
# - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# - RELAYER_PRIVATE_KEY
# - NEXT_PUBLIC_ROADGUARD_ADDRESS

# Run development server
npm run dev

# Build for production
npm run build
```

---

## Environment Variables

```env
# Google Maps (required for map)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Contract address on Mantle
NEXT_PUBLIC_ROADGUARD_ADDRESS=0x23a95d01af99F06c446522765E6F3E604865D58a

# Relayer wallet (for anonymous submissions)
# This wallet needs MNT for gas + stakes
RELAYER_PRIVATE_KEY=0x...
```

---

## Why Mantle?

| Advantage | Impact |
|-----------|--------|
| **~$0.01 Gas** | Micropayments viable, relayer sustainable |
| **EVM Compatible** | Standard Solidity + tooling |
| **High Throughput** | Real-time report updates |
| **Low Fees** | Relayer can subsidize many reports |

---

## Hackathon Tracks

### ZK & Privacy Track
- **Relayer Architecture**: User wallet never on-chain
- **Commit-Reveal Scheme**: Cryptographic proof of ownership
- **Selective Disclosure**: Claim rewards without revealing report history

### GameFi & Social Track
- **Token Incentives**: "Regards" micropayments
- **Community Validation**: Stake-based confirmation system
- **Gamified Safety**: Turn reporting into rewarding activity

---

## Project Structure

```
MantleHackathon/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/relay/report/  # Relayer API endpoint
│   │   │   └── page.tsx           # Main app
│   │   ├── components/
│   │   │   ├── map/               # Google Maps integration
│   │   │   ├── dashboard/         # Main dashboard UI
│   │   │   └── layout/            # Report sheet, header
│   │   └── hooks/
│   │       └── useRoadGuard.ts    # Contract hooks + relayer
│   └── .env.local                 # Environment config
│
├── contracts/
│   ├── src/RoadGuard.sol          # Main contract
│   └── test/RoadGuard.t.sol       # Foundry tests
│
└── README.md
```

---

## API Endpoints

### POST /api/relay/report
Submit anonymous report via relayer.

```typescript
// Request
{
  commitment: "0x...",      // bytes32 commitment hash
  latitude: 19.4326,        // number
  longitude: -99.1332,      // number
  eventType: 0,             // 0-5
  stakeAmount?: "1000..."   // optional, defaults to MIN_STAKE
}

// Response
{
  success: true,
  txHash: "0x...",
  blockNumber: "12345",
  relayerAddress: "0xD6F44...",
  message: "Report submitted anonymously via relayer"
}
```

### GET /api/relay/report
Check relayer status and balance.

```typescript
// Response
{
  status: "active",
  relayerAddress: "0xD6F44...",
  balance: "2290000000000000000",
  balanceFormatted: "2.2900 MNT",
  minStake: "0.001 MNT"
}
```

---

## License

MIT

---

## Team

Built with privacy in mind for Mantle Global Hackathon 2025
