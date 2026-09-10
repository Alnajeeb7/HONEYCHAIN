// Transaction layer: submits on-chain writes and returns a normalized async
// result. The caller (server.js) ALWAYS saves the DB record first, then calls
// these — on failure the DB record is preserved with status FAILED for retry.
//
// Every function degrades gracefully to a { status: 'DEMO' } result when
// blockchain is disabled, so the existing app keeps working unchanged.
import { getContract } from './contract.js';
import { getEthers, isEnabled, networkInfo, txUrl } from './provider.js';
import { toBytes32 } from './hash.js';

// keccak256 of the human-readable batch ID (needs ethers for real hashing).
async function idHash(batchId) {
  const ethers = await getEthers();
  if (!ethers) return toBytes32(null);
  return ethers.keccak256(ethers.toUtf8Bytes(String(batchId)));
}

function demoResult(reason = 'blockchain disabled') {
  return { status: 'DEMO', confirmed: false, txHash: null, blockNumber: null, reason };
}

// Errors worth retrying: public RPC rate-limits, timeouts, transient network
// blips, and nonce/replacement races. Contract reverts are NOT retried.
function isTransient(e) {
  const s = `${e?.code || ''} ${e?.shortMessage || ''} ${e?.message || ''}`.toLowerCase();
  return /rate.?limit|429|timeout|timed out|econn|network|socket|could not coalesce|nonce|replacement|already known|server error|503|502|bad response|missing response|failed to detect/.test(s);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Serialize all on-chain writes through a single queue. Concurrent submissions
// from one service wallet collide on the nonce and get dropped by the RPC —
// this guarantees one tx is fully submitted before the next starts.
let _chain = Promise.resolve();
function enqueue(task) {
  const run = _chain.then(task, task);
  _chain = run.catch(() => {}); // keep the queue alive on failure
  return run;
}

async function submitWithRetry(fn, args, attempts = 3) {
  const contract = await getContract();
  if (!contract) return demoResult();
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const tx = await contract[fn](...args);
      const receipt = await tx.wait(1);
      const info = networkInfo();
      return {
        status: 'CONFIRMED',
        confirmed: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber ?? null,
        network: info.name,
        chainId: info.chainId,
        contractAddress: contract.target,
        explorerUrl: txUrl(tx.hash),
      };
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1 && isTransient(e)) {
        await sleep(1500 * (i + 1)); // 1.5s, 3s backoff before retrying
        continue;
      }
      break;
    }
  }
  return { status: 'FAILED', confirmed: false, txHash: null, blockNumber: null, error: lastErr?.shortMessage || lastErr?.message || String(lastErr) };
}

async function sendTx(fn, args) {
  return enqueue(() => submitWithRetry(fn, args));
}

const ts = (t) => {
  const n = t ? Math.floor(new Date(t).getTime() / 1000) : Math.floor(Date.now() / 1000);
  return Number.isFinite(n) ? n : Math.floor(Date.now() / 1000);
};

export async function registerBatch({ batchId, recordHash, evidenceHash, ipfsCid, timestamp }) {
  if (!isEnabled()) return demoResult();
  const id = await idHash(batchId);
  return sendTx('registerBatch', [id, toBytes32(recordHash), toBytes32(evidenceHash), ipfsCid || '', ts(timestamp)]);
}

// Maps an app event type to the right contract method.
const EVENT_FN = {
  COLLECTION: 'recordCollection',
  PROCESSING: 'recordProcessing',
  EXPORT: 'recordExport',
};

export async function registerEvent({ batchId, eventType, recordHash, evidenceHash, ipfsCid, passed, timestamp }) {
  if (!isEnabled()) return demoResult();
  const id = await idHash(batchId);
  const t = ts(timestamp);
  const rh = toBytes32(recordHash);
  const eh = toBytes32(evidenceHash);
  const cid = ipfsCid || '';
  const type = String(eventType || '').toUpperCase();

  if (type === 'LAB') return sendTx('recordLabResult', [id, rh, eh, cid, !!passed, t]);
  const fn = EVENT_FN[type];
  if (fn) return sendTx(fn, [id, rh, eh, cid, t]);
  // Anything else is a generic (non-status-changing) event.
  return sendTx('recordGenericEvent', [id, type, rh, eh, cid, t]);
}

// Evidence is registered as part of the owning event (registerBatch/Event pass
// the evidenceHash + CID). This standalone helper anchors evidence via a
// generic event when needed.
export async function registerEvidence({ batchId, recordHash, evidenceHash, ipfsCid, timestamp }) {
  return registerEvent({ batchId, eventType: 'EVIDENCE', recordHash, evidenceHash, ipfsCid, timestamp });
}
