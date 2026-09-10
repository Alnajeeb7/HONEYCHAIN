# HoneyChain — Blockchain Integrity Layer

This `blockchain/` project is an **additive** integrity layer for the existing
HoneyChain full-stack app. It does **not** replace the app, its database, or its
authentication. The database keeps all detailed records; IPFS stores evidence
files; the blockchain stores only proofs of authenticity (hashes + CIDs).

## What's on-chain vs off-chain

| On-chain (this contract) | Off-chain (app DB / IPFS) |
|---|---|
| batchIdHash, recordHash, evidenceHash | full user info, detailed forms |
| eventType, ipfsCid, actor, timestamp | lab measurements, GPS w/ privacy |
| status transitions | images / large docs (IPFS only) |

No image binaries and no PII are ever written on-chain.

## Contract

`contracts/HoneyChainTraceability.sol` — OpenZeppelin `AccessControl` roles
(BEEKEEPER/COLLECTOR/LAB/PROCESSOR/EXPORTER/AUDITOR). Enforces the same status
lifecycle as the app (HARVESTED → COLLECTED → LAB_PASSED/LAB_FAILED →
PROCESSED → PACKAGED → EXPORTED). Illegal or out-of-order steps revert on-chain.

## Setup

```bash
cd blockchain
npm install
cp .env.example .env       # fill in a TESTNET service-wallet key + RPC URL
npm run compile
npm test                   # unit tests on the in-memory Hardhat network
```

## Deploy (testnet — never mainnet initially)

```bash
# local sanity
npx hardhat node                      # in one terminal
npm run deploy:local                  # in another

# testnets (configurable — Amoy default, Sepolia available)
npm run deploy:amoy
npm run deploy:sepolia
```

Deploy writes `deployments/<network>.json` (address + ABI). Copy the printed
`CONTRACT_ADDRESS` into the **backend** `.env` — the backend service layer reads
the address + ABI from there and submits transactions with the service wallet.

## Security

- `.env` is git-ignored. **Never commit** the private key, RPC credentials, or
  API keys. Never expose any of these in frontend code.
- Use a dedicated **testnet** wallet funded from a faucet — never a personal
  mainnet wallet.
- Transactions are async: the backend saves the DB record first, then submits
  the tx (PENDING → CONFIRMED/FAILED with retry). A failed tx never deletes app
  data.
