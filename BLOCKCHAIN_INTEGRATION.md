# HoneyChain — Blockchain & IPFS Integration

This document describes the **additive** integrity layer bolted onto the
existing HoneyChain full-stack app. The original application, its database, its
authentication and every existing feature are **unchanged**. The blockchain and
IPFS layers only *add* proofs of authenticity.

## Architecture

```
          detailed records            evidence files            proof of authenticity
   ┌──────────────────────┐   ┌────────────────────────┐   ┌────────────────────────────┐
   │  Application Database │   │          IPFS          │   │        Blockchain (EVM)      │
   │  (all form data, lab  │   │  (image binaries only, │   │  batchIdHash, recordHash,    │
   │   values, GPS, users) │   │   addressed by CID)    │   │  evidenceHash, CID, status)  │
   └──────────┬───────────┘   └───────────┬────────────┘   └──────────────┬───────────────┘
              │                            │                               │
              └──────────── backend service wallet submits transactions ───┘
```

- **On-chain:** batchId hash, event type, canonical `recordHash`, evidence
  hash, IPFS CID, timestamp, actor, status transitions. No PII, no images.
- **Off-chain (DB):** full user info, detailed forms, lab measurements,
  privacy-sensitive GPS, large docs.
- **IPFS:** evidence image binaries only — never on-chain.

## Data flow (evidence + event)

1. Upload evidence → validate (image only) → SHA-256 hash → duplicate detection.
2. Upload to IPFS (Pinata/local/demo) → store CID + hash in DB.
3. Save the supply-chain event in the DB (never blocked by the chain).
4. Compute canonical `recordHash = SHA-256(batchId + eventType + timestamp + fields + evidenceHash)`.
5. Submit a transaction anchoring `recordHash` + evidenceHash + CID on-chain.
6. Store `txHash`, `blockNumber`, `network`, `contractAddress` on the event.

Transactions are **async & non-destructive**: DB save first → submit →
`PENDING_CHAIN` → `CONFIRMED` (tx saved) or `FAILED` (record preserved, retry
available via `POST /api/batches/:id/retry-chain`). When the chain is disabled
the event is marked `DEMO` and the app runs fully offline.

## Components

| Layer | Location |
|---|---|
| Smart contract + Hardhat + tests | `blockchain/` |
| Backend blockchain service | `backend/services/blockchain/` |
| Backend IPFS service | `backend/services/ipfs/` |
| API integration | `backend/server.js` (uses the services; no chain code in routes) |
| Frontend UI | `frontend/src/components/ui.jsx` (`BlockchainInfo`, `BlockchainVerificationPanel`), consumer + audit pages |

## New API endpoints

- `GET  /api/blockchain/status` — network, contract, mode (live/demo).
- `GET  /api/batches/:id/verify-chain` — per-event DB-hash vs on-chain MATCH/MISMATCH.
- `POST /api/batches/:id/retry-chain` — re-anchor pending/failed events.
- `GET  /api/evidence/:id/verify` — evidence registered on-chain? content hash still matches?

Existing stage endpoints now also return a `blockchain` object (`blockchainStatus`, `txHash`, `blockNumber`, `network`, `explorerUrl`).

## Setup

### 1. Contract (testnet — never mainnet initially)

```bash
cd blockchain
npm install
cp .env.example .env        # testnet service-wallet key + RPC (never commit)
npm run compile && npm test
npm run deploy:amoy         # or deploy:sepolia
# copy the printed CONTRACT_ADDRESS into backend/.env
```

### 2. Backend

```bash
cd backend
npm install                 # now includes ethers + dotenv
cp .env.example .env
# to go live: set BLOCKCHAIN_ENABLED=1 + RPC + PRIVATE_KEY + CONTRACT_ADDRESS
# to use real IPFS: IPFS_PROVIDER=pinata + IPFS_API_KEY (JWT)
npm start
```

Leaving `BLOCKCHAIN_ENABLED=0` and `IPFS_PROVIDER=demo` keeps everything in safe
demo mode with deterministic CIDs and simulated anchoring.

### 3. Frontend

```bash
cd frontend
npm install && npm run dev
```

## Security

- All secrets live in `.env` files that are git-ignored. **Never commit or
  share** `BLOCKCHAIN_PRIVATE_KEY`, `IPFS_API_SECRET`, or RPC credentials, and
  never place them in frontend code.
- Use a dedicated **testnet** wallet funded from a faucet — never a personal
  mainnet wallet.
- App authentication is untouched; blockchain identity (the service wallet) is
  separate from application identity.

## Tamper test (demo)

1. Record a lab test (e.g. moisture 18.2%) → event anchored, `verify-chain`
   shows MATCH.
2. Edit the stored moisture to 25.8% in the DB file.
3. Re-run `GET /api/batches/:id/verify-chain` → the recomputed recordHash no
   longer matches the anchored hash → **MISMATCH** (tamper detected). The local
   hash-chain `verify-integrity` also flags it. Image integrity works the same
   way: change the file and `GET /api/evidence/:id/verify` returns MISMATCH.
