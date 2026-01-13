# RoadGuard v2.0

> **Privacy-Preserving Road Incident Reports on Mantle**
>
> Built for Mantle Global Hackathon 2025 | ZK & Privacy + GameFi & Social Tracks

![Mantle](https://img.shields.io/badge/Mantle-L2-65B3AE?style=for-the-badge)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge)

---

## The Problem

Current road incident reporting apps (Waze, Google Maps) expose user identity:

- **Privacy Risk**: Reporters of protests, police activity can be identified and targeted
- **No Incentives**: Users report for free with no reward for accuracy
- **Centralized Control**: Platforms can be forced to reveal user data

## The Solution

**RoadGuard** is a decentralized, privacy-preserving road incident network:

| Feature | Description |
|---------|-------------|
| **Anonymous Reporting** | Commit-reveal scheme ensures wallet address is never on-chain |
| **Anti-Spam Economics** | Stake to report; returned on community confirmation |
| **Reward Loop** | "Regards" micropayments from grateful users |
| **Fully On-Chain** | No centralized database to subpoena |

---

## Tech Stack

### Frontend
- **Next.js 15** - React Server Components + App Router
- **Three.js** - Immersive 3D hero animations (WebGL)
- **Google Maps API** - Custom Mantle-branded dark theme
- **Tailwind CSS** - Material Design system
- **Framer Motion** - Smooth animations
- **wagmi/viem** - Web3 integration

### Smart Contracts
- **Solidity 0.8.24** - Foundry framework
- **OpenZeppelin** - Security-audited base contracts
- **100% Test Coverage** - Foundry fuzzing + unit tests

### Infrastructure
- **Mantle L2** - Low gas fees enable micropayments
- **Neon Postgres** - Geo-indexed report cache
- **Vercel** - Edge deployment

---

## Quick Start

```bash
# 1. Install dependencies
make install

# 2. Configure environment
cp frontend/.env.example frontend/.env.local
cp contracts/.env.example contracts/.env
# Edit both files with your API keys

# 3. Run tests
make test

# 4. Start development
make frontend-dev

# 5. Deploy to testnet
make deploy-testnet
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│  ┌───────────────┐  ┌─────────────────┐  ┌───────────────────────────────┐ │
│  │  Three.js     │  │  Google Maps    │  │  Material Design + Tailwind  │ │
│  │  Hero Scene   │  │  Custom Dark    │  │  Component System            │ │
│  │  (WebGL)      │  │  (Mantle Brand) │  │  (Mobile-First)              │ │
│  └───────────────┘  └─────────────────┘  └───────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼───────────────────────────────────────────┐
│                           APPLICATION LAYER                                    │
│  Next.js 15 + Wagmi + TanStack Query + Framer Motion                          │
└───────────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼───────────────────────────────────────────┐
│                           BLOCKCHAIN LAYER (Mantle L2)                        │
│  RoadGuard.sol: Reports, Confirmations, Rewards, Slashing                     │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract API

```solidity
// Submit anonymous report
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

| ID | Type | Color | Use Case |
|----|------|-------|----------|
| 0 | Accident | 🔴 Red | Vehicle collisions |
| 1 | Road Closure | 🟠 Orange | Construction, events |
| 2 | Protest | 🟣 Purple | Demonstrations |
| 3 | Police Activity | 🔵 Blue | Checkpoints, activity |
| 4 | Hazard | 🟡 Yellow | Debris, conditions |
| 5 | Traffic Jam | ⚫ Gray | Congestion |

---

## Why Mantle?

| Advantage | Impact |
|-----------|--------|
| **~$0.01 Gas** | Micropayments viable |
| **EVM Compatible** | Standard tooling works |
| **High Throughput** | Real-time updates |
| **Modular Architecture** | Future ZK integration |

---

## Hackathon Tracks

### ZK & Privacy ($15K pool)
- Privacy-preserving commit-reveal scheme
- Reporter identity never on-chain
- Selective disclosure of rewards

### GameFi & Social ($15K pool)
- Token incentive design ("regards")
- Community validation mechanics
- Gamified safety reporting

### Additional Prizes
- **Best UX/Demo** ($5K) - Immersive 3D experience
- **Best Mantle Integration** ($4K) - Low-fee micropayments
- **Grand Prize** ($30K) - Overall excellence

---

## Demo

### 3D Hero Scene
The app opens with an immersive WebGL scene featuring:
- Particle network visualization
- Glowing orbital rings
- Mouse-reactive lighting
- Smooth transition to map

### Custom Google Maps
Mantle-branded dark theme with:
- Event type markers with status indicators
- Real-time confirmation badges
- Regards tip functionality
- Mobile-optimized controls

---

## Security

- **Reentrancy Guards** - OpenZeppelin ReentrancyGuard
- **Access Control** - Owner-only admin functions
- **Slashing Mechanism** - Economic penalty for spam
- **Privacy by Design** - Only commitment hashes on-chain

---

## Project Structure

```
MantleHackathon/
├── contracts/
│   ├── src/RoadGuard.sol      # Main contract
│   ├── test/RoadGuard.t.sol   # Foundry tests
│   └── script/Deploy.s.sol    # Deployment script
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js pages
│   │   ├── components/
│   │   │   ├── three/         # 3D animations
│   │   │   ├── map/           # Google Maps
│   │   │   ├── ui/            # Design system
│   │   │   └── layout/        # App structure
│   │   ├── hooks/             # Web3 hooks
│   │   └── lib/               # Config
│   └── __tests__/             # Jest tests
│
├── database/
│   └── schema.sql             # Neon Postgres
│
├── DEPLOYMENT.md              # Deployment guide
├── Makefile                   # Build commands
└── README.md
```

---

## Commands

```bash
# Testing
make test                 # All tests
make test-contracts       # Contract tests only
make test-frontend        # Frontend tests only
make test-coverage        # Coverage report

# Deployment
make deploy-testnet       # Deploy to Mantle Sepolia
make deploy-mainnet       # Deploy to Mantle Mainnet (careful!)
make deploy-dry-run       # Simulate deployment

# Development
make frontend-dev         # Start dev server
make frontend-build       # Production build
make format               # Format code
make clean                # Clean artifacts
```

---

## Team

Built with 💚 for Mantle Global Hackathon 2025

---

## License

MIT
