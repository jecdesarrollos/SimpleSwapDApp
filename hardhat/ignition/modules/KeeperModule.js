// ignition/modules/DeployModule.js

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("KeeperModule", (m)=>{
	// 1. Get the deployer Account
	//const deployerAccount = m.getAccount(0);
	// 2. Deploy the contract
	const Keeper = m.contract("Keeper");
	// 3. return the deployed contract
	return {Keeper};
});