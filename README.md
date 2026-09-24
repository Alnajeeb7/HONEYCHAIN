# 🍯 HoneyChain

**A full-stack blockchain-based honey traceability system built for KVIC's Honey Mission.**

HoneyChain brings end-to-end supply chain transparency to the Indian honey ecosystem — from beekeeper to consumer — using distributed ledger technology and decentralized storage.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Backend | Node.js, Express |
| Blockchain | Hyperledger Fabric (stubbed) |
| Storage | IPFS (stubbed) |

---

## ✨ Features

- **Beekeeper Registration** — Onboard honey producers with verified identity and farm details
- **Batch Tracking** — Log honey batches at each stage of the supply chain
- **Consumer Verification** — Fully functional QR-based verification page for end consumers to trace honey origin
- **Vertical Icon Sidebar** — Clean, icon-based navigation for a streamlined UI/UX
- **Blockchain Stubs** — Hyperledger Fabric and IPFS integration stubs ready for production deployment

---

## 📦 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x

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

Frontend runs on `http://localhost:5173` and backend on `http://localhost:3000` by default.

---

## 🗂️ Project Structure

```
honeychain/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route-level pages
│   │   └── assets/       # Static assets
│   └── vite.config.js
├── server/               # Node.js + Express backend
│   ├── routes/           # API routes
│   ├── controllers/      # Business logic
│   ├── stubs/            # Hyperledger Fabric & IPFS stubs
│   └── index.js
└── README.md
```

---

## 🔗 Blockchain & Storage

HoneyChain is architected for **Hyperledger Fabric** as its permissioned blockchain layer and **IPFS** for decentralized document/image storage. Both are currently implemented as stubs to allow full UI development and testing without requiring a live network.

To connect to a real Hyperledger Fabric network, replace the stub handlers in `server/stubs/` with your Fabric SDK client calls.

---

## 🏛️ Built For

**KVIC Honey Mission** — Khadi and Village Industries Commission's initiative to empower beekeepers and ensure honey purity across India's supply chain.

---

## 👤 Developer

**Azeez** — [AzeezAeroDev](https://github.com/AzeezAeroDev)

---

## 📄 License

MIT License — feel free to fork and build on this.
