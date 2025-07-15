# SimpleSwap DApp - Decentralized Exchange

### **Project Links**
* **Live Application (Sepolia):** `https://tp4-frontend.vercel.app/`
* **Test Coverage Report:** `https://coverage-report-zeta.vercel.app/`
* **Demonstration Video:** `https://youtu.be/btd9hjmlMhU`

---

### ## Project Overview

SimpleSwap is a decentralized application (DApp) that implements a Uniswap V2-style exchange for ERC-20 tokens and liquidity management on the Sepolia testnet. This project demonstrates foundational Decentralized Finance (DeFi) functionalities, including token swapping, liquidity provision, and dynamic price discovery based on an Automated Market Maker (AMM) model.

The project is built with a focus on security, efficiency, and comprehensive testing.

---

### ## Smart Contract Details & Security

This section provides critical information for auditing and verification purposes.

#### **Deployed Contracts (Sepolia Testnet)**
* **`SimpleSwap`:** `0x2E69e49Ef7da58FFCfFc03b1d8f026B9e04FEA05`
* **`MyTokenA`:** `0x02a36F4fDe45D84425e94C224F4981260423c25d`
* **`MyTokenB`:** `0x951dcbf11737764c7aba36f5efbc62ea39a07bcc`

#### **Access Control**
* The `SimpleSwap.sol` contract uses the **`Ownable`** pattern from OpenZeppelin.
* The **owner** is the address that deployed the contract.
* **Owner-only functions** are `withdrawETH()` and `recoverERC20()`, designed for emergency fund recovery and preventing tokens from being trapped in the contract. All core AMM functions (`addLiquidity`, `swap`, etc.) are permissionless.

#### **Testing and Coverage**
The contract suite has been rigorously tested using Hardhat's testing environment.

* **Test Results:** **16/16 tests passed** successfully, covering all core logic and edge cases.
* **Coverage Summary:** The project exceeds standard quality requirements with comprehensive test coverage.

| File               | % Stmts   | % Branch | % Funcs   | % Lines   |
| ------------------ | --------  | -------- | -------   | -------   |
| **SimpleSwap.sol** | **83.05** | **62.9** | **80**    | **82.89** |
| **All files**      | **80.95** | **59.09**| **73.68** | **81.25** |

*The uncovered lines in `SimpleSwap.sol` correspond to the emergency recovery functions, which are out of the scope of the main functionality tests.*

---

### ## Quickstart Guide (Local Development)

Follow these steps to set up and run this project locally.

**Prerequisites:**
* Node.js (v18+), npm (v9+) or Yarn.
* Git.
* MetaMask browser extension.

**1. Initial Setup:**
Clone the repository and install the dependencies for both sub-projects.

```bash
git clone git@github.com:jecdesarrollos/SimpleSwapDApp.git
cd SimpleSwapDApp/

# Install Hardhat dependencies
cd hardhat/ && npm install && cd ../

# Install Frontend dependencies
cd frontend/ && npm install && cd ../