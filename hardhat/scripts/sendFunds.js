// Importar ethers desde Hardhat
const hre = require("hardhat");

async function main() {
  // 1. Definir la dirección de destino y la cantidad
  const direccionDestino = "0xc3af0a826992F00E640410E4F871e9DCECc22CE3"; // geth account 2
  // const direccionDestino = "0xc632E710FE2EF3CF9b19834b73c480Cb91CB32F5"; 
  const cantidad = hre.ethers.parseEther("0.06"); // 10 ETH

  // 2. Obtener la cuenta firmante (definida en hardhat.config.js)
  const [signer] = await hre.ethers.getSigners();
  console.log(`Enviando fondos desde la cuenta: ${signer.address}`);

  // 3. Enviar la transacción
  console.log(`Enviando ${hre.ethers.formatEther(cantidad)} ETH a ${direccionDestino}...`);
  const tx = await signer.sendTransaction({
    to: direccionDestino,
    value: cantidad,
  });

  // 4. Esperar a que la transacción sea minada
  await tx.wait();

  console.log("¡Transacción completada con éxito!");
  console.log(`Hash de la transacción: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});