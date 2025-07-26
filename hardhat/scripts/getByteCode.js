const hre = require("hardhat");

async function main() {
  // 1. Reemplazá con la dirección del contrato
  const CONTRACT_ADDRESS = "0x5359be4a782e3506D4C2B43C45A657Ef58c30270";

  console.log(`Obteniendo el bytecode de la dirección: ${CONTRACT_ADDRESS}`);

  // 2. Usamos el 'provider' para pedir el código almacenado en esa dirección
  const bytecode = await hre.ethers.provider.getCode(CONTRACT_ADDRESS);

  if (bytecode === "0x") {
    console.log("No hay ningún contrato desplegado en esta dirección.");
  } else {
    console.log("\n--- Bytecode Desplegado ---");
    console.log(bytecode);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});