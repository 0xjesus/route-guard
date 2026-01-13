# RoadGuard Deployment Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- [Node.js](https://nodejs.org/) v18+ installed
- Wallet with MNT tokens (testnet or mainnet)
- Google Maps API Key
- Neon Database account

## Quick Start

### 1. Clone & Install

```bash
# Install contract dependencies
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-git

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Contracts
cd contracts
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# Frontend
cd ../frontend
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 3. Deploy Smart Contracts

#### Testnet (Mantle Sepolia)

```bash
cd contracts

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --broadcast \
  --verify \
  -vvv

# Save the deployed address!
```

#### Mainnet (Production)

```bash
cd contracts

# ⚠️ Double-check everything before mainnet deployment!

# Dry run first
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.mantle.xyz \
  -vvv

# Deploy for real
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.mantle.xyz \
  --broadcast \
  --verify \
  -vvv
```

### 4. Update Frontend Config

After deployment, update `frontend/src/lib/wagmi.ts`:

```typescript
export const ROADGUARD_ADDRESS = {
  [mantleSepoliaTestnet.id]: "0x_YOUR_TESTNET_ADDRESS_HERE",
  [mantle.id]: "0x_YOUR_MAINNET_ADDRESS_HERE",
} as const;
```

### 5. Set Up Database

```bash
# Create Neon database at https://neon.tech
# Copy the connection string to DATABASE_URL in .env.local

# Run schema
cd database
psql $DATABASE_URL < schema.sql
```

### 6. Run Frontend

```bash
cd frontend

# Development
npm run dev

# Production build
npm run build
npm start
```

### 7. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Set environment variables in Vercel dashboard
# - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# - DATABASE_URL
# - NEXT_PUBLIC_ROADGUARD_ADDRESS_TESTNET
# - NEXT_PUBLIC_ROADGUARD_ADDRESS_MAINNET
```

---

## Contract Verification

### Automatic (with deploy script)

The `--verify` flag handles this automatically.

### Manual Verification

```bash
forge verify-contract \
  --chain-id 5003 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.24 \
  YOUR_CONTRACT_ADDRESS \
  src/RoadGuard.sol:RoadGuard \
  --etherscan-api-key $MANTLESCAN_API_KEY
```

---

## Testing

### Smart Contracts

```bash
cd contracts

# Run all tests
forge test -vv

# Run with gas report
forge test --gas-report

# Run specific test
forge test --match-test test_submitReport_success -vvv

# Coverage
forge coverage
```

### Frontend

```bash
cd frontend

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## Network Configuration

### Mantle Sepolia Testnet

| Parameter | Value |
|-----------|-------|
| Chain ID | 5003 |
| RPC URL | https://rpc.sepolia.mantle.xyz |
| Explorer | https://sepolia.mantlescan.xyz |
| Faucet | https://faucet.sepolia.mantle.xyz |

### Mantle Mainnet

| Parameter | Value |
|-----------|-------|
| Chain ID | 5000 |
| RPC URL | https://rpc.mantle.xyz |
| Explorer | https://mantlescan.xyz |

---

## Troubleshooting

### "Insufficient funds"

Get testnet MNT from the [faucet](https://faucet.sepolia.mantle.xyz).

### "Contract verification failed"

1. Ensure compiler version matches exactly
2. Check optimizer settings match foundry.toml
3. Try verifying with flattened source

### "Map not loading"

1. Check Google Maps API key is valid
2. Ensure billing is enabled on Google Cloud
3. Check browser console for CORS errors

### "Transaction reverted"

1. Check you're on the right network
2. Ensure wallet has enough MNT for gas + stake
3. Check contract state (is report already confirmed?)

---

## Security Checklist

Before mainnet deployment:

- [ ] Run `forge test` - all tests pass
- [ ] Run `slither .` for static analysis
- [ ] Review all external calls
- [ ] Check reentrancy guards
- [ ] Verify owner is correct address
- [ ] Test on testnet first
- [ ] Get code review from team

---

## Support

- [Mantle Docs](https://docs.mantle.xyz)
- [Foundry Book](https://book.getfoundry.sh)
- [Discord](https://discord.gg/mantle)
