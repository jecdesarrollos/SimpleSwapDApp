const { ethers } = require("hardhat");

async function main() {
  
  const SimpleSwapABI = require("../artifacts/contracts/SimpleSwap.sol/SimpleSwap.json").abi;

  const SIMPLESWAP_ADDRESS = "0x8aBb8E62Bd73f4c73b2CE7a02631B2dC911Ab720";
  const MYTOKENA_ADDRESS = "0x993F00eb9C73e3E4eAe3d6Afb4Ba65A6b8B5E597";
  const MYTOKENB_ADDRESS = "0xd771D7C0e1EBE89C9E9F663824851BB89b926d1a";

  const [deployer] = await ethers.getSigners();
  const simpleSwap = new ethers.Contract(SIMPLESWAP_ADDRESS, SimpleSwapABI, deployer);

  try {
    const [reserveA, reserveB] = await simpleSwap.getReserves(MYTOKENA_ADDRESS, MYTOKENB_ADDRESS);

    console.log("\n--- Reserves ---");
    console.log(`Reserves MyTokenA: ${ethers.formatUnits(reserveA, 18)}`);
    console.log(`Reserves MyTokenB: ${ethers.formatUnits(reserveB, 18)}`);
    console.log("---------------------------------------");

  } catch (error) {
    console.error("Getting reserves error.");
    console.error(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});