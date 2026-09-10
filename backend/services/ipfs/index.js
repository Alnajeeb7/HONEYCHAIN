// Provider-agnostic IPFS service with a deterministic demo fallback.
//
// Supported providers (via env IPFS_PROVIDER):
//   "pinata"  -> Pinata pinning API (IPFS_API_KEY = JWT, or key+secret)
//   "local"   -> local IPFS daemon via ipfs-http-client (127.0.0.1:5001)
//   "demo"    -> (default) deterministic demo CID from the file hash; no network
//
// NEVER store image binaries on-chain. This layer returns a CID + hash; the
// caller anchors only the hash + CID reference on the blockchain.
//
// Env (never committed / never in frontend):
//   IPFS_PROVIDER, IPFS_API_KEY, IPFS_API_SECRET, IPFS_GATEWAY_URL
import crypto from 'crypto';

export function provider() {
  return (process.env.IPFS_PROVIDER || 'demo').toLowerCase();
}

export function gatewayBase() {
  return (process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs').replace(/\/+$/, '');
}

export function gatewayUrl(cid) {
  if (!cid) return null;
  return `${gatewayBase()}/${cid}`;
}

export function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function demoCid(buffer) {
  // Deterministic, CID-like string derived from the content hash so demo mode
  // is stable and duplicate detection still works offline.
  return `demo-${sha256Hex(buffer).slice(0, 44)}`;
}

// --- Pinata -----------------------------------------------------------------
async function pinataUpload(buffer, fileName) {
  const jwt = process.env.IPFS_API_KEY;
  const key = process.env.IPFS_API_KEY;
  const secret = process.env.IPFS_API_SECRET;
  const form = new FormData();
  const blob = new Blob([buffer]);
  form.append('file', blob, fileName || 'evidence');
  const headers = {};
  // Prefer JWT (single IPFS_API_KEY). Fall back to key+secret pair.
  if (jwt && !secret) headers.Authorization = `Bearer ${jwt}`;
  else if (key && secret) { headers.pinata_api_key = key; headers.pinata_secret_api_key = secret; }
  const resp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST', headers, body: form,
  });
  if (!resp.ok) throw new Error(`Pinata upload failed: ${resp.status}`);
  const json = await resp.json();
  return json.IpfsHash;
}

// --- local daemon -----------------------------------------------------------
let _localClient = null;
let _localTried = false;
async function localClient() {
  if (_localTried) return _localClient;
  _localTried = true;
  try {
    const mod = await import('ipfs-http-client');
    _localClient = mod.create({ url: 'http://127.0.0.1:5001/api/v0' });
  } catch { _localClient = null; }
  return _localClient;
}

/**
 * Upload a buffer to IPFS. Returns { cid, hash, mode, gatewayUrl }.
 * Always succeeds — falls back to a demo CID on any provider error.
 */
export async function upload(buffer, fileName) {
  const hash = sha256Hex(buffer);
  const p = provider();
  try {
    if (p === 'pinata') {
      const cid = await pinataUpload(buffer, fileName);
      return { cid, hash, mode: 'pinata', gatewayUrl: gatewayUrl(cid) };
    }
    if (p === 'local') {
      const client = await localClient();
      if (client) {
        const r = await client.add(buffer);
        const cid = r.cid ? r.cid.toString() : r.path;
        return { cid, hash, mode: 'local', gatewayUrl: gatewayUrl(cid) };
      }
    }
  } catch { /* fall through to demo */ }
  const cid = demoCid(buffer);
  return { cid, hash, mode: 'demo', gatewayUrl: gatewayUrl(cid) };
}

/** Retrieve bytes for a CID via the configured gateway (demo CIDs return null). */
export async function retrieve(cid) {
  if (!cid || String(cid).startsWith('demo-')) return null;
  try {
    const resp = await fetch(gatewayUrl(cid));
    if (!resp.ok) return null;
    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  } catch { return null; }
}

/** Pin an existing CID (Pinata pinByHash). No-op for demo/local. */
export async function pin(cid) {
  if (provider() !== 'pinata' || !cid || String(cid).startsWith('demo-')) return { pinned: false, mode: provider() };
  try {
    const jwt = process.env.IPFS_API_KEY;
    const resp = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ hashToPin: cid }),
    });
    return { pinned: resp.ok, mode: 'pinata' };
  } catch { return { pinned: false, mode: 'pinata' }; }
}

/**
 * Verify that the content behind a CID still hashes to the expected value.
 * Returns { available, match }. For demo CIDs we compare the embedded hash.
 */
export async function verify(cid, expectedHash) {
  const expect = String(expectedHash || '').replace(/^sha256:/i, '').toLowerCase();
  if (!cid) return { available: false, match: null };
  if (String(cid).startsWith('demo-')) {
    return { available: true, match: cid === `demo-${expect.slice(0, 44)}` };
  }
  const buf = await retrieve(cid);
  if (!buf) return { available: false, match: null };
  return { available: true, match: sha256Hex(buf) === expect };
}

export function status() {
  return { provider: provider(), gateway: gatewayBase() };
}
