// Importar ethers desde Hardhat
const hre = require("hardhat");

async function main() {
  // 1. Definir la dirección de destino y la cantidad
   //  const direccionDestino = "0x230464d34A1c8268CfAEBf7F4388E0c7Bd0309a2"; // < geth-net fedora validator node account 1
    const direccionDestino = "0xc3af0a826992F00E640410E4F871e9DCECc22CE3"; // < geth-net fedora account 2
  //const direccionDestino = "0x365336ED346951af9d2CF98A8FDE5699DBc60259"; // <- BESU IBFT2 Fedora validator node1
  //const direccionDestino = "0x761E04C11EAD6706826F3b54f92ca2aAEb7Ca4E9"; // <- BESU IBFT2 Fedora 
  
  // const direccionDestino = "0xc632E710FE2EF3CF9b19834b73c480Cb91CB32F5"; 
  //const cantidad = hre.ethers.parseEther("0.06"); // 10 ETH

  // 2. Obtener la cuenta firmante (definida en hardhat.config.js)
//  const [signer] = await hre.ethers.getSigners();
  //  console.log(`Enviando fondos desde la cuenta: ${signer.address}`);

  console.log(`consultando balance de ${direccionDestino}...`);

  const saldo = await hre.ethers.provider.getBalance(direccionDestino);

  console.log(`Saldo: ${saldo}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});