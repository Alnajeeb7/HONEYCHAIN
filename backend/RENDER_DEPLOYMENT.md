# HoneyChain Backend - Render Deployment Guide

## Environment Variables Required for Render

When deploying to Render, add these environment variables in the Render dashboard:

```
PORT=4000
NODE_ENV=production
BLOCKCHAIN_ENABLED=0
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x041A6784780CE499d3e44FD616A3612a58f1f296
IPFS_PROVIDER=demo
CORS_ORIGIN=*
FABRIC_ENABLED=0
```

## Deployment Steps

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect HONEYCHAIN GitHub repo
4. Set Root Directory to `backend`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Add the environment variables above
8. Click Deploy

## Local Development

```bash
npm install
npm run dev
```

Server runs on http://localhost:4000
