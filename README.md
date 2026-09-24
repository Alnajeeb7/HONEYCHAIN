# 🍯 HoneyChain

> **Decentralized Honey Traceability on the Blockchain — Powered by Hyperledger Fabric & IPFS**

HoneyChain is a production-grade **dApp** (Decentralized Application) that brings full supply chain transparency to India's honey ecosystem. Built for **KVIC's Honey Mission**, every batch of honey is immutably recorded on a permissioned blockchain — from hive to hand — so consumers can verify authenticity with a single scan.

No middlemen. No tampering. Just pure, traceable honey on-chain.

---

## ⛓️ Why Blockchain?

Traditional honey supply chains are opaque — adulteration is rampant and origin verification is nearly impossible. HoneyChain solves this by:

- Writing every supply chain event as an **immutable transaction** on Hyperledger Fabric
- Storing batch documents and certificates on **IPFS** — decentralized, tamper-proof
- Giving consumers a **cryptographically verifiable** QR code that traces honey back to its registered beekeeper

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Backend | Node.js, Express |
| Blockchain | Hyperledger Fabric |
| Decentralized Storage | IPFS |
| Smart Contracts | Hyperledger Fabric Chaincode (Go/Node) |
| Identity & Access | Fabric CA (Certificate Authority) |

---

## ✨ Core Features

- **🐝 Beekeeper Onboarding** — Registered producers get a Fabric identity; all batches are cryptographically tied to them
- **📦 Batch Lifecycle Tracking** — Every stage (harvest → processing → packaging → distribution) is written as a ledger transaction
- **🔍 Consumer Verification** — Scan a QR code to pull the full provenance of any honey batch directly from the chain
- **📁 IPFS Document Storage** — Lab reports, certifications, and batch photos pinned on IPFS with content-addressed hashes stored on-chain
- **🧭 Vertical Icon Sidebar** — Intuitive, minimal navigation built for both desktop and field operators
- **🔐 Permissioned Network** — Hyperledger Fabric's private channel architecture ensures only verified orgs can write to the ledger

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                  React dApp                  │
│         (Vite + Tailwind CSS v3)             │
└───────────────────┬──────────────────────────┘
                    │ REST API
┌───────────────────▼──────────────────────────┐
│           Node.js / Express Server           │
│     (Fabric SDK Client + IPFS Client)        │
└────────┬──────────────────────┬──────────────┘
         │                      │
┌────────▼────────┐   ┌─────────▼──────────────┐
│  Hyperledger    │   │          IPFS           │
│  Fabric Network │   │  (Decentralized Store)  │
│  (Chaincode)    │   │                         │
└─────────────────┘   └─────────────────────────┘
```

---

## 📦 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Docker & Docker Compose (for Fabric network)

### Installation

```bash
# Clone the repository
git clone https://github.com/AzeezAeroDev/honeychain.git
cd honeychain

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### Running the App

```bash
# Start the backend server
cd server
npm run dev

# Start the frontend (in a separate terminal)
cd client
npm run dev
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:3000`

> To spin up the full Hyperledger Fabric network locally, refer to `/fabric/README.md` and run `./network.sh up`.

---

## 🗂️ Project Structure

```
honeychain/
├── client/                  # React + Vite dApp frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages
│   │   └── assets/
│   └── vite.config.js
├── server/                  # Node.js + Express backend
│   ├── routes/              # API routes
│   ├── controllers/         # Business logic
│   ├── fabric/              # Hyperledger Fabric SDK integration
│   ├── ipfs/                # IPFS client integration
│   └── index.js
├── chaincode/               # Fabric chaincode (smart contracts)
└── fabric/                  # Network config, crypto materials
```

---

## 🔗 On-Chain Data Model

Each honey batch stored on the ledger contains:

```json
{
  "batchId": "HB-2025-00142",
  "beekeeperId": "BK-KVIC-TN-001",
  "origin": "Nilgiris, Tamil Nadu",
  "harvestDate": "2025-03-14",
  "variety": "Multiflora",
  "weightKg": 48.5,
  "labReportCID": "Qm...ipfs-hash",
  "certCID": "Qm...ipfs-hash",
  "currentStage": "RETAIL",
  "txHistory": ["..."]
}
```

---

## 🏛️ Built For

**KVIC Honey Mission** — Khadi and Village Industries Commission's national initiative to empower Indian beekeepers, ensure honey purity, and modernize the honey supply chain.

---

## 👤 Developer

**Najeeb** — [HONEYCHAIN](https://github.com/Alnajeeb7/HONEYCHAIN/)

---

## 📄 License

MIT License
