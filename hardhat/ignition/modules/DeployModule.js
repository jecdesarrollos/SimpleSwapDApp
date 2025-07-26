// ignition/modules/DeployModule.js

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SimpleSwapModule", (m) => {
  // 1. Obtiene la cuenta que está realizando el despliegue.
  // Esta será la misma dirección para el owner y el recipient inicial.
  const deployerAccount = m.getAccount(0);

  // 2. Despliega los tokens.
  // Pasamos la misma cuenta (deployerAccount) para ambos parámetros del constructor.
  const tokenA = m.contract("MyTokenA", [deployerAccount, deployerAccount]);
  const tokenB = m.contract("MyTokenB", [deployerAccount, deployerAccount]);
  
  // 3. Despliega el contrato principal, pasándole la cuenta del deployer como owner.
  const simpleSwap = m.contract("SimpleSwap", [deployerAccount]);

  // 4. Devuelve los contratos desplegados.
  return { tokenA, tokenB, simpleSwap };
});

