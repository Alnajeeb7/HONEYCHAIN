// Public facade for the EVM blockchain integrity layer.
// server.js imports from here only — implementation details (provider, wallet,
// contract, tx lifecycle) stay encapsulated. Everything degrades to a safe
// "DEMO" mode when BLOCKCHAIN_ENABLED != 1 so the existing app is untouched.
export { computeRecordHash, normalizeHash, sha256Hex, toBytes32 } from './hash.js';
export { isEnabled, networkInfo, networkKey, explorerBase, txUrl } from './provider.js';
export { contractAddress } from './contract.js';
export { registerBatch, registerEvent, registerEvidence } from './transactions.js';
export { getBatch, getBatchEventCount, verifyRecord, verifyEvidence } from './verification.js';

import { isEnabled, networkInfo, explorerBase } from './provider.js';
import { contractAddress } from './contract.js';

/** A small object the API/UI can surface to show chain wiring status. */
export function status() {
  const info = networkInfo();
  return {
    enabled: isEnabled(),
    network: info.name,
    chainId: info.chainId,
    explorer: explorerBase(),
    contractAddress: contractAddress(),
    mode: isEnabled() ? 'live' : 'demo',
  };
}
