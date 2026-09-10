// Read-only verification layer. Recompute-and-compare is done by the caller
// (server.js) using computeRecordHash on current DB data; these functions ask
// the chain what it has anchored so the two can be compared (MATCH/MISMATCH).
import { getContract } from './contract.js';
import { getEthers, isEnabled } from './provider.js';
import { toBytes32 } from './hash.js';

async function idHash(batchId) {
  const ethers = await getEthers();
  if (!ethers) return null;
  return ethers.keccak256(ethers.toUtf8Bytes(String(batchId)));
}

const STATUS_NAMES = ['NONE', 'HARVESTED', 'COLLECTED', 'LAB_PASSED', 'LAB_FAILED', 'PROCESSED', 'PACKAGED', 'EXPORTED'];

export async function getBatch(batchId) {
  if (!isEnabled()) return null;
  const contract = await getContract();
  if (!contract) return null;
  try {
    const id = await idHash(batchId);
    const r = await contract.getBatch(id);
    if (!r.exists) return null;
    return {
      recordHash: r.recordHash,
      status: STATUS_NAMES[Number(r.status)] || String(r.status),
      creator: r.creator,
      createdAt: Number(r.createdAt),
      eventCount: Number(r.eventCount),
      exists: r.exists,
    };
  } catch { return null; }
}

export async function getBatchEventCount(batchId) {
  if (!isEnabled()) return null;
  const contract = await getContract();
  if (!contract) return null;
  try { return Number(await contract.getBatchEventCount(await idHash(batchId))); }
  catch { return null; }
}

/** Confirm a recomputed recordHash is anchored on-chain for this batch. */
export async function verifyRecord(batchId, recordHash) {
  if (!isEnabled()) return { available: false, match: null };
  const contract = await getContract();
  if (!contract) return { available: false, match: null };
  try {
    const id = await idHash(batchId);
    const match = await contract.verifyRecord(id, toBytes32(recordHash));
    return { available: true, match: !!match };
  } catch { return { available: false, match: null }; }
}

/** Confirm an evidence hash is registered on-chain; returns its CID. */
export async function verifyEvidence(evidenceHash) {
  if (!isEnabled()) return { available: false, registered: null, cid: null };
  const contract = await getContract();
  if (!contract) return { available: false, registered: null, cid: null };
  try {
    const [registered, cid] = await contract.verifyEvidence(toBytes32(evidenceHash));
    return { available: true, registered: !!registered, cid: cid || null };
  } catch { return { available: false, registered: null, cid: null }; }
}
