const { ethers } = require("hardhat");

async function main() {
  const SimpleSwapABI = require("../artifacts/contracts/SimpleSwap.sol/SimpleSwap.json").abi;

  const SIMPLESWAP_ADDRESS = "0x8aBb8E62Bd73f4c73b2CE7a02631B2dC911Ab720";
  const MYTOKENA_ADDRESS = "0x993F00eb9C73e3E4eAe3d6Afb4Ba65A6b8B5E597";
  const MYTOKENB_ADDRESS = "0xd771D7C0e1EBE89C9E9F663824851BB89b926d1a";

  const MyTokenA_ABI = require("../artifacts/contracts/MyTokenA.sol/MyTokenA.json").abi;
  const MyTokenB_ABI = require("../artifacts/contracts/MyTokenB.sol/MyTokenB.json").abi;

  const [deployer] = await ethers.getSigners();
  const simpleSwap = new ethers.Contract(SIMPLESWAP_ADDRESS, SimpleSwapABI, deployer);
  const tokenA = new ethers.Contract(MYTOKENA_ADDRESS, MyTokenA_ABI, deployer);
  const tokenB = new ethers.Contract(MYTOKENB_ADDRESS, MyTokenB_ABI, deployer);

  try {
    // Obtener los decimales de los tokens para formatear el precio
    const decA = Number(await tokenA.decimals());
    const decB = Number(await tokenB.decimals());

    const priceAInB_Raw = await simpleSwap.getPrice(MYTOKENA_ADDRESS, MYTOKENB_ADDRESS);
    const priceAInB_Formatted = ethers.formatUnits(priceAInB_Raw, decB);

    console.log(`\n--- Price ---`);
    console.log(`1 MyTokenA = ${priceAInB_Formatted} MyTokenB`);
    
    const priceBInA_Raw = await simpleSwap.getPrice(MYTOKENB_ADDRESS, MYTOKENA_ADDRESS);
    const priceBInA_Formatted = ethers.formatUnits(priceBInA_Raw, decA);

    console.log(`1 MyTokenB = ${priceBInA_Formatted} MyTokenA`);
    console.log("---------------------------------");

  } catch (error) {
    console.error("Price Error.");
    console.error(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});