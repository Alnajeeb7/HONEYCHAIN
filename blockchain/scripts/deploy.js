// Deploys HoneyChainTraceability and writes the address/ABI to a location the
// backend service layer can pick up. Run:
//   npx hardhat run scripts/deploy.js --network amoy
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const net = hre.network.name;
  console.log(`Deploying HoneyChainTraceability to "${net}" as ${deployer.address}`);

  const Factory = await hre.ethers.getContractFactory("HoneyChainTraceability");
  // Pass the deployer as admin/service wallet.
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`Deployed at: ${address}`);

  // Export address + ABI so the backend can consume them without re-compiling.
  const artifact = await hre.artifacts.readArtifact("HoneyChainTraceability");
  const out = {
    network: net,
    chainId: Number(hre.network.config.chainId || 0),
    address,
    deployedBy: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${net}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outFile}`);
  console.log("\nNext: set CONTRACT_ADDRESS in the backend .env to:", address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
