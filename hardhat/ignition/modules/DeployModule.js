// ignition/modules/DeployModule.js

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Definimos el módulo. "SimpleSwapModule" es un ID único para este despliegue.
module.exports = buildModule("SimpleSwapModule", (m) => {
  // 1. Parámetros de entrada para el módulo (más seguro que hardcodear)
  const ownerAndRecipient = m.getParameter(
    "ownerAndRecipient",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" // My address
  );
  

  const tokenA = m.contract("MyTokenA", [ownerAndRecipient, ownerAndRecipient]);
  const tokenB = m.contract("MyTokenB", [ownerAndRecipient, ownerAndRecipient]);
  
  
  const simpleSwap = m.contract("SimpleSwap", [ownerAndRecipient]);

  console.log("Módulo de despliegue configurado.");
  console.log("Owner y Recipient:", ownerAndRecipient);
  
  // 4. Devolvemos los contratos para poder interactuar con ellos si es necesario.
  return { tokenA, tokenB, simpleSwap };
});