# Phone Testing

The frontend is the single public entry point. Vite proxies `/api` to the
backend, so the phone can use one HTTPS URL and the backend remains local.

## Start the app

Use separate terminals:

```powershell
cd backend
npm start
```

```powershell
cd frontend
npm run dev
```

The blockchain folder is not a browser server. Keep its local Hardhat node
running only when the backend is configured to use it; otherwise the backend's
configured testnet or demo blockchain mode is used from the computer.

## Create the secure tunnel

Install `cloudflared` once from Cloudflare's official downloads page, then run:

```powershell
cd frontend
npm run tunnel
```

Cloudflared prints an `https://...trycloudflare.com` URL. Open that URL on the
phone while the backend and frontend terminals remain running.

## Quick checks

Open the tunnel URL in the phone browser, then verify the API through the same
origin by opening:

```text
https://YOUR-TUNNEL.trycloudflare.com/api/health
```

Do not change `frontend/src/api.js` to the computer's LAN IP. The relative API
URL and Vite proxy are what make the tunneled app work without exposing a
second public port.