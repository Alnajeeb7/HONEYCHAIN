require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// --- Configurable network selection ---------------------------------------
// Defaults to Polygon Amoy testnet (chainId 80002). Sepolia (11155111) is also
// wired up. NEVER commit real secrets — everything comes from .env.
const {
  BLOCKCHAIN_RPC_URL,
  BLOCKCHAIN_PRIVATE_KEY,
  AMOY_RPC_URL,
  SEPOLIA_RPC_URL,
  POLYGONSCAN_API_KEY,
  ETHERSCAN_API_KEY,
} = process.env;

// Accept a single generic RPC/key pair (used by the backend service too) or
// network-specific overrides.
const accounts = BLOCKCHAIN_PRIVATE_KEY ? [BLOCKCHAIN_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    amoy: {
      url: AMOY_RPC_URL || BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || BLOCKCHAIN_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: POLYGONSCAN_API_KEY || "",
      sepolia: ETHERSCAN_API_KEY || "",
    },
  },
};
