### **SimpleSwap DApp - Decentralized Exchange**

**Project Links**

  * **Live Application (Sepolia):** `https://tp4-frontend.vercel.app/`
  * **Test Coverage Report:** `https://coverage-report-zeta.vercel.app/`
  * **Video: `https://youtu.be/btd9hjmlMhU`
### Project Overview

**Practical Work Module 4: Front-End Creation and Testing for SimpleSwap**, integrating a React-based interface with the `SimpleSwap` contract to handle wallet connections (MetaMask) and execute the DApp's core operations.

**SimpleSwap is a decentralized application (DApp) that implements an exchange for ERC-20 tokens and liquidity management on the Sepolia testnet. This project demonstrates foundational Decentralized Finance (DeFi) functionalities through robust and thoroughly tested smart contracts.


### Key Features

  * **Custom ERC-20 Tokens:** Utilizes two tokens (MyTokenA and MyTokenB) for exchange operations.
  * **Liquidity Management:** Allows users to provide and withdraw liquidity from the pool, receiving LP (Liquidity Provider) tokens in return.
  * **Decentralized Swapping:** Facilitates token exchanges through an Automated Market Maker (AMM) model.
  * **Price Discovery:** Provides real-time pricing based on the token reserves in the liquidity pool.
   
### Technology Stack

  * **Smart Contracts (`hardhat/`):**
      * **Language:** Solidity (`^0.8.27`).
      * **Environment:** Hardhat for compilation, deployment, and testing.
      * **Libraries:** Ethers.js, Chai, Mocha, and OpenZeppelin Contracts.
  * **Frontend (`frontend/`):**
      * **Library:** React.
      * **Build Tool:** Vite.
      * **Blockchain Interaction:** Ethers.js for MetaMask integration.
      * **Styling:** CSS for a responsive interface.
  * **Deployment & Infrastructure:**
      * **Network:** Sepolia Testnet.
      * **RPC Provider:** Infura.
      * **Block Explorer:** Etherscan.
      * **Frontend Hosting:** Vercel.
      * **Version Control:** GitHub.

### Project Structure

The project is organized as a repo to maintain a separation between the backend and frontend.

```
SimpleSwapDApp/
├── hardhat/
│   ├── contracts/        # Solidity contracts
│   ├── scripts/          # Deployment scripts
│   ├── test/             # Unit tests for contracts
│   ├── hardhat.config.js # Hardhat configuration
│   └── .env              # Environment variables (not versioned)
├── frontend/
│   ├── src/              # React application source code
│   ├── package.json      # Frontend dependencies
│   └── .env              # Environment variables (not versioned)
└── README.md
```

### Quickstart Guide (Local Development)

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
```

**2. Environment Variables:**
Create `.env` files in both the `hardhat/` and `frontend/` directories, using the corresponding `.env.example` files as templates. These are required for API keys and contract addresses.

**3. Core Commands (`hardhat/` directory):**

  * **Run tests:** `npx hardhat test`
  * **Generate coverage report:** `npx hardhat coverage`
  * **Deploy to a local network:** `npx hardhat run scripts/deploy.js --network localhost`
  * **Deploy to Sepolia:** `npx hardhat run scripts/deploy.js --network sepolia`
  * **Verify contract on Etherscan:** `npx hardhat verify --network sepolia <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGUMENTS]`

**4. Running the Frontend (`frontend/` directory):**
Start the Vite development server and open the provided URL in your browser.

```bash
cd frontend/
npm run dev
```

### Contact Information

  * **Developed by:** Jorge Enrique Cabrera 
