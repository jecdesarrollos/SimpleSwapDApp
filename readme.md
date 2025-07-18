# SimpleSwap DApp - A Uniswap V2-Style Decentralized Exchange

## Project Overview

**SimpleSwap** is a decentralized application (DApp) that implements a Uniswap V2-style exchange on the Sepolia testnet. This project demonstrates core Decentralized Finance (DeFi) concepts, including token swapping, liquidity provision, and dynamic price discovery through an Automated Market Maker (AMM) model.

This document provides a comprehensive overview of the smart contract architecture, security considerations, and testing methodology for auditing purposes.

-----

## Live Demo & Project Links

  * **Live Application (Sepolia):** [`https://simple-swap-d-app.vercel.app//`](https://www.google.com/search?q=%5Bhttps://simple-swap-d-app.vercel.app/%5D\(https://tp4-frontend.vercel.app/\))
  * **Test Coverage Report:** [`https://coverage-report-zeta.vercel.app/`](https://www.google.com/search?q=%5Bhttps://coverage-report-zeta.vercel.app/%5D\(https://coverage-report-zeta.vercel.app/\))

-----

## Smart Contracts & Architecture

The system is composed of a suite of modular smart contracts, prioritizing security and standard practices by building upon OpenZeppelin libraries.

### Deployed Contracts (Sepolia Testnet)

  * **`SimpleSwap` (Core AMM):** [`0xc42A20B60255a96a74CbdDdB992E854a006755d5`](https://www.google.com/search?q=%5Bhttps://sepolia.etherscan.io/address/0xc42A20B60255a96a74CbdDdB992E854a006755d5%5D\(https://sepolia.etherscan.io/address/0xc42A20B60255a96a74CbdDdB992E854a006755d5\))
  * **`MyTokenA` (MTA):** [`0x8540e176C6Eca07cA883B65e4f3dd2ABC5768E6e`](https://www.google.com/search?q=%5Bhttps://sepolia.etherscan.io/address/0x8540e176C6Eca07cA883B65e4f3dd2ABC5768E6e%5D\(https://sepolia.etherscan.io/address/0x8540e176C6Eca07cA883B65e4f3dd2ABC5768E6e\))
  * **`MyTokenB` (MTB):** [`0xE1Ed976E539A335F21F32cb9A47ba0A86aB48669`](https://www.google.com/search?q=%5Bhttps://sepolia.etherscan.io/address/0xE1Ed976E539A335F21F32cb9A47ba0A86aB48669%5D\(https://sepolia.etherscan.io/address/0xE1Ed976E539A335F21F32cb9A47ba0A86aB48669\))
  * **Project Developer Wallet:** [`0x60b1D95b9DF21e19DdAf88Ef11B74Bc534C0a5CE`](https://www.google.com/search?q=%5Bhttps://sepolia.etherscan.io/address/0x60b1D95b9DF21e19DdAf88Ef11B74Bc534C0a5CE%5D\(https://sepolia.etherscan.io/address/0x60b1D95b9DF21e19DdAf88Ef11B74Bc534C0a5CE\))

### Contract File Structure

The `contracts/` directory includes:

  * `SimpleSwap.sol`: The core AMM logic contract, inheriting from OpenZeppelin's `Ownable` and `ERC20`.
  * `ISimpleSwap.sol`: The public interface for the `SimpleSwap` contract.
  * `MyTokenA.sol` / `MyTokenB.sol`: Standard ERC-20 token contracts for testing and interaction.
  * `ContractsMaliciousReceiver.sol` / `SuccessResponse.sol`: Mock contracts used exclusively for advanced security testing of failure and success paths.

### Security & Access Control

  * **Ownership:** The `SimpleSwap.sol` contract utilizes OpenZeppelin's `Ownable` pattern. Administrative functions are restricted to the owner.
  * **Emergency Functions:** The owner-only functions `withdrawETH()` and `recoverERC20()` are designed for emergency recovery of accidentally sent funds. The `recoverERC20` function is secured against malicious draining of pool liquidity by only allowing the withdrawal of surplus tokens (balance \> reserve).
  * **Error Handling:** The contract exclusively uses **custom errors** for reverting transactions, providing gas efficiency and clear error reasons without using long strings.

-----

## ✅ Testing and Quality Assurance

The project has undergone an exhaustive testing process using the **Hardhat** framework to guarantee correctness, security, and robustness.

  * **Test Suite:** The suite comprises **52 passing tests**, covering all functions, modifiers, events, and a wide range of logical branches and potential failure points.
  * **Methodology:** The tests cover:
      * **Unit Testing:** Each function is tested for its expected inputs and outputs.
      * **Integration Testing:** Multiple functions are tested in sequence to ensure state consistency.
      * **Revert Testing:** All `require` conditions and modifiers are tested to ensure they fail as expected.
      * **Security Testing:** Includes tests for access control vulnerabilities and advanced scenarios like failed ETH transfers from the owner address.

### Final Coverage Report

The project achieves **100% statement, function, and line coverage** on all core and mock contracts, with near-perfect branch coverage.

| File | % Stmts | % Branch | % Funcs | % Lines |
| :--- | :--- | :--- | :--- | :--- |
| **All files** | **100** | **98.68** | **100** | **100** |
| `SimpleSwap.sol` | 100 | 98.48 | 100 | 100 |

-----

## Quickstart Guide (Local Development)

### Prerequisites

  * Node.js (v18+)
  * npm or Yarn
  * Git

### Installation & Setup

```bash
# Clone the repository
git clone git@github.com:jecdesarrollos/SimpleSwapDApp.git
cd SimpleSwapDApp

# Install Hardhat (backend) dependencies
cd hardhat/
npm install
```

### Running Tests

```bash
# Run the complete test suite
npx hardhat test

# Generate a detailed coverage report
npx hardhat coverage
```

### Deployment (Hardhat Ignition)

This project uses **Hardhat Ignition** for robust and declarative deployments.

```bash
# In one terminal, start a local Hardhat node
npx hardhat node

# In a second terminal, deploy the contracts
# (Replace 'Deploy.js' with the actual name of your module file)
npx hardhat ignition deploy ignition/modules/Deploy.js --network localhost
```