require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
const GETH_IP_ADDRESS = process.env.GETH_IP_ADDRESS;
const GETH_PRIVATE_KEY = process.env.GETH_PRIVATE_KEY;
const BESU_IP_ADDRESS = process.env.BESU_IP_ADDRESS;
const BESU_PRIVATE_KEY = process.env.BESU_PRIVATE_KEY;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
    sourcify: {
    enabled: true,
    ipfsUrl: "http://192.168.0.101:5001", 
  },
  networks: {
      geth_net: { 
      url: process.env.GETH_IP_ADDRESS,
      accounts: [`0x${process.env.GETH_PRIVATE_KEY}`],
      chainId: 55444, // Mantenemos el ID que no entra en conflicto
      gasPrice: 1000000000 // 1 Gwei, un valor fijo y simple
    },
      besu_remote: { 
      url: BESU_IP_ADDRESS,
      accounts: [BESU_PRIVATE_KEY],
    chainId: 55444, // Mantenemos el ID que no entra en conflicto
    gasPrice: 1000000000 // 1 Gwei, un valor fijo y simple
    },
	sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};