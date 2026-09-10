// Loads the deployed contract (address + ABI) and returns an ethers.Contract
// bound to the service wallet. ABI/address come from:
//   1. CONTRACT_ADDRESS env + deployments/<network>.json (written by deploy.js)
//   2. a minimal embedded ABI fallback (so the backend works even if the
//      deployments file isn't copied over yet)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getWallet, getEthers, networkKey, isEnabled } from './provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal ABI covering the functions the backend calls. Full ABI is loaded
// from deployments/<network>.json when available.
const FALLBACK_ABI = [
  'function registerBatch(bytes32 batchIdHash, bytes32 recordHash, bytes32 evidenceHash, string ipfsCid, uint64 timestamp)',
  'function recordCollection(bytes32 batchIdHash, bytes32 recordHash, bytes32 evidenceHash, string ipfsCid, uint64 timestamp)',
  'function recordLabResult(bytes32 batchIdHash, bytes32 recordHash, bytes32 evidenceHash, string ipfsCid, bool passed, uint64 timestamp)',
  'function recordProcessing(bytes32 batchIdHash, bytes32 recordHash, bytes32 evidenceHash, string ipfsCid, uint64 timestamp)',
  'function recordExport(bytes32 batchIdHash, bytes32 recordHash, bytes32 evidenceHash, string ipfsCid, uint64 timestamp)',
  'function recordGenericEvent(bytes32 batchIdHash, string eventType, bytes32 recordHash, bytes32 evidenceHash, string ipfsCid, uint64 timestamp)',
  'function getBatch(bytes32 batchIdHash) view returns (bytes32 recordHash, uint8 status, address creator, uint64 createdAt, uint32 eventCount, bool exists)',
  'function getBatchEventCount(bytes32 batchIdHash) view returns (uint256)',
  'function verifyRecord(bytes32 batchIdHash, bytes32 recordHash) view returns (bool)',
  'function verifyEvidence(bytes32 evidenceHash) view returns (bool registered, string cid)',
];

let _contract = null;
let _abiSource = null;

function loadDeployment() {
  try {
    const p = path.join(__dirname, '..', '..', '..', 'blockchain', 'deployments', `${networkKey()}.json`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { /* ignore */ }
  return null;
}

export async function getContract() {
  if (_contract) return _contract;
  if (!isEnabled()) return null;
  const wallet = await getWallet();
  const ethers = await getEthers();
  if (!wallet || !ethers) return null;

  const dep = loadDeployment();
  const abi = dep?.abi || FALLBACK_ABI;
  _abiSource = dep?.abi ? 'deployment' : 'fallback';
  const address = process.env.CONTRACT_ADDRESS || dep?.address;
  if (!address) return null;

  _contract = new ethers.Contract(address, abi, wallet);
  return _contract;
}

export function contractAddress() {
  return process.env.CONTRACT_ADDRESS || loadDeployment()?.address || null;
}

export function abiSource() { return _abiSource; }
