const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts account:", deployer.address);

  // Dsploy MyTokenA
  const MyTokenA = await ethers.getContractFactory("MyTokenA");
  const myTokenA = await MyTokenA.deploy(deployer.address, deployer.address);
  await myTokenA.waitForDeployment();
  console.log("MyTokenA deployed address:", await myTokenA.getAddress());

  // Deploy MyTokenB
  const MyTokenB = await ethers.getContractFactory("MyTokenB");
  const myTokenB = await MyTokenB.deploy(deployer.address, deployer.address);
  await myTokenB.waitForDeployment();
  console.log("MyTokenB deployed address:", await myTokenB.getAddress());

  // Desploy SimpleSwap
  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  const simpleSwap = await SimpleSwap.deploy(deployer.address);
  await simpleSwap.waitForDeployment();
  console.log("SimpleSwap desplegado en:", await simpleSwap.getAddress());

  console.log("\n--- Deployed contracts ---");
  console.log(`MyTokenA Address: ${await myTokenA.getAddress()}`);
  console.log(`MyTokenB Address: ${await myTokenB.getAddress()}`);
  console.log(`SimpleSwap Address: ${await simpleSwap.getAddress()}`);
  console.log("-----------------------------------------------------");

  // Minting tokens
  console.log("\nMinting tokens for deploy...");
  const initialSupply = ethers.parseUnits("1000", 18); // 1000 tokens
  await myTokenA.mint(deployer.address, initialSupply);
  await myTokenB.mint(deployer.address, initialSupply);
  console.log(`Minted ${ethers.formatUnits(initialSupply, 18)} MyTokenA y MyTokenB para ${deployer.address}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });