const hre = require("hardhat");

async function main() {
  // --- CONFIGURACIÓN ---
  const CONTRACT_NAME = "Keeper";
  const CONTRACT_ADDRESS = "0x5359be4a782e3506D4C2B43C45A657Ef58c30270";
  const NEW_NUMBER = 888; // El nuevo número que quieres guardar
  // ---------------------

  console.log(`Conectando al contrato ${CONTRACT_NAME} en la dirección: ${CONTRACT_ADDRESS}`);

  // Hardhat se "conecta" al contrato que ya vive en la blockchain
  const contract = await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS);

  // 1. OBTENER EL NÚMERO ACTUAL
  // Reemplaza "myNumber" con el nombre real de tu variable o función getter
  let currentNumber = await contract.getter();
  //console.log(`El número actual es: ${currentNumber.toString()}`);

  // 2. CAMBIAR EL NÚMERO
  //console.log(`\nEnviando transacción para cambiar el número a ${NEW_NUMBER}...`);
  // Reemplaza "setter" con el nombre real de tu función para cambiar el número
  //const tx = await contract.setter(NEW_NUMBER);

  // Esperar a que la transacción sea minada
  //await tx.wait();
  console.log("¡Transacción completada con éxito!");
  //console.log(`Hash de la transacción: ${tx.hash}`);

  // 3. VERIFICAR EL NUEVO NÚMERO
  //currentNumber = await contract.getter();
  console.log(`\nEl nuevo número es: ${currentNumber.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});