// Canonical record hashing shared by DB, blockchain and verification.
// recordHash = SHA-256( canonicalJSON({ batchId, eventType, timestamp, fields, evidenceHash }) )
//
// The SAME function is used when (a) first anchoring an event and (b) later
// re-verifying it. Tamper detection = recompute from current DB data and
// compare against the hash stored on-chain (MATCH / MISMATCH).
import crypto from 'crypto';

export function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

export function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Strip a "sha256:" prefix if present so hashes compare cleanly.
export function normalizeHash(h) {
  if (!h) return null;
  return String(h).replace(/^sha256:/i, '').toLowerCase();
}

/**
 * Compute the canonical record hash for a supply-chain event.
 * @param {object} p { batchId, eventType, timestamp, fields, evidenceHash }
 * @returns {string} hex SHA-256 (no prefix)
 */
export function computeRecordHash({ batchId, eventType, timestamp, fields = {}, evidenceHash = null }) {
  const payload = {
    batchId: String(batchId),
    eventType: String(eventType),
    timestamp: String(timestamp || ''),
    fields,
    evidenceHash: normalizeHash(evidenceHash),
  };
  return sha256Hex(canonical(payload));
}

// keccak256 of a UTF-8 string as a 0x-prefixed bytes32 — used to map the
// human-readable batch ID onto the contract's bytes32 key WITHOUT ethers.
export function keccakId(str) {
  // Lazy import of ethers happens in provider; here we only need a stable
  // deterministic mapping. We defer to ethers.keccak256 at call sites that
  // have it. This helper is a fallback that returns null so callers know to
  // use ethers.
  return null;
}

// Convert a hex SHA-256 (64 chars) to a 0x-prefixed bytes32 for on-chain use.
export function toBytes32(hexOrNull) {
  const h = normalizeHash(hexOrNull);
  if (!h) return '0x' + '0'.repeat(64);
  return '0x' + h.padStart(64, '0').slice(0, 64);
}
