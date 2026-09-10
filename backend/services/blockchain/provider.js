// Provider + service wallet. Lazily imports ethers so the app still boots if
// ethers is not installed or blockchain is disabled — in that case we run in
// "demo" mode and never throw at import time.
//
// Config (all from env, NEVER hardcoded / committed):
//   BLOCKCHAIN_ENABLED     "1" to attempt real chain calls (default off => demo)
//   BLOCKCHAIN_RPC_URL     RPC endpoint (Alchemy/Infura/public)
//   BLOCKCHAIN_PRIVATE_KEY service wallet key (TESTNET only)
//   BLOCKCHAIN_NETWORK     "amoy" | "sepolia" (informational + explorer)
//   CONTRACT_ADDRESS       deployed HoneyChainTraceability address
let _ethers = null;
let _tried = false;
let _provider = null;
let _wallet = null;

export const NETWORKS = {
  amoy: {
    name: 'Polygon Amoy',
    chainId: 80002,
    explorer: 'https://amoy.polygonscan.com',
  },
  sepolia: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    explorer: 'https://sepolia.etherscan.io',
  },
};

export function networkKey() {
  return (process.env.BLOCKCHAIN_NETWORK || 'sepolia').toLowerCase();
}

export function networkInfo() {
  const key = networkKey();
  return NETWORKS[key] || NETWORKS.sepolia;
}

export function explorerBase() {
  return process.env.BLOCK_EXPLORER_URL || networkInfo().explorer;
}

export function txUrl(txHash) {
  if (!txHash) return null;
  return `${explorerBase()}/tx/${txHash}`;
}

export function isEnabled() {
  return process.env.BLOCKCHAIN_ENABLED === '1'
    && !!process.env.BLOCKCHAIN_RPC_URL
    && !!process.env.BLOCKCHAIN_PRIVATE_KEY
    && !!process.env.CONTRACT_ADDRESS;
}

export async function getEthers() {
  if (_tried) return _ethers;
  _tried = true;
  try { _ethers = (await import('ethers')); } catch { _ethers = null; }
  return _ethers;
}

export async function getProvider() {
  if (_provider) return _provider;
  if (!isEnabled()) return null;
  const ethers = await getEthers();
  if (!ethers) return null;
  _provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  return _provider;
}

export async function getWallet() {
  if (_wallet) return _wallet;
  const provider = await getProvider();
  if (!provider) return null;
  const ethers = await getEthers();
  _wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
  return _wallet;
}
