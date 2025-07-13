# SimpleSwapDApp - Decentralized Exchange

-----

## 🚀 Live DApp and Key Reports

Access the live application and its supporting documentation directly:

  * **Live DApp URL:** [https://tp4-frontend.vercel.app/](https://tp4-frontend.vercel.app/)
  * **Test Coverage Report:** [https://coverage-report-zeta.vercel.app/](https://coverage-report-zeta.vercel.app/)

-----

## Project Overview

SimpleSwapDApp is a decentralized exchange (DApp) developed on the Ethereum blockchain, enabling users to **swap custom ERC-20 tokens (MyTokenA and MyTokenB)** and **manage liquidity** for the token pair. This project demonstrates core Decentralized Finance (DeFi) functionalities, all powered by robust and thoroughly tested smart contracts.

The DApp is currently deployed on the **Sepolia Testnet** for public accessibility and demonstration purposes.

-----

## Project Requirements Fulfillment

This project successfully addresses the requirements for **Practical Work Module 4: Front-End Creation and Testing for SimpleSwap**.

1.  **Contract Interaction:** A React-based frontend has been developed to facilitate seamless interaction with the `SimpleSwap` contract. It enables wallet connection (MetaMask) and supports the following key functions:
      * Exchanging MyTokenA for MyTokenB and vice-versa.
      * Adding and removing liquidity from the token pool.
      * Retrieving the current price of one token relative to the other.
2.  **Development & Testing Environment:**
      * Implemented the project using **Hardhat** for smart contract development.
      * Thoroughly tested the `SimpleSwap` contract, achieving a **code coverage exceeding 90%** (verified via `npx hardhat coverage`).
3.  **Instructor's Recommendations:** All recommendations provided during the Module 3 `SimpleSwap` contract review have been fully implemented.
4.  **Permitted Tools:** Utilized **React** for the frontend, **Hardhat** for smart contracts, and **Ethers.js** for blockchain interaction.
5.  **Storage & Deployment:**
      * All project programs and smart contracts are stored in this **GitHub repository**.
      * The frontend application is deployed and publicly accessible on **Vercel**.

-----

## Key Features

  * **Custom ERC-20 Tokens:** Utilizes two bespoke ERC-20 tokens, MyTokenA and MyTokenB, for exchange operations.
  * **Liquidity Management:** Users can supply liquidity to the token pair, receiving LP (Liquidity Provider) tokens, and withdraw their provided liquidity.
  * **Decentralized Swapping:** Enables peer-to-peer token exchange through the Automated Market Maker (AMM) model.
  * **Dynamic Price Discovery:** Provides real-time pricing based on the token reserves within the liquidity pool.
  * **Blockchain-Powered Logic:** All critical transaction logic is executed on the Sepolia Testnet, ensuring decentralization, transparency, and immutability.
  * **Intuitive User Interface:** A clean and responsive React application enhances user experience.
  * **Comprehensive Error Handling:** Incorporates custom Solidity errors and robust frontend error messaging for clear user feedback.

-----

## Technologies Utilized

### Smart Contracts (`hardhat/`)

  * **Solidity:** Programming language for Ethereum smart contracts (version `^0.8.27`).
  * **Hardhat:** Ethereum development environment for smart contract compilation, deployment, testing, and debugging.
  * **Ethers.js:** Integrated within Hardhat for blockchain interaction and scripting.
  * **Chai & Mocha:** Industry-standard testing frameworks for writing and executing smart contract unit tests.
  * **OpenZeppelin Contracts:** Utilized for secure and audited ERC-20 and Ownable contract implementations.

### Frontend (`frontend/`)

  * **React:** A declarative, component-based JavaScript library for building user interfaces.
  * **Vite:** A modern frontend build tool that provides a fast development environment and optimized production builds.
  * **Ethers.js:** Employed on the client-side for seamless integration with MetaMask and interaction with deployed smart contracts.
  * **CSS:** Used for styling and ensuring a responsive user interface across various devices.

### Deployment & Infrastructure

  * **Sepolia Testnet:** The chosen Ethereum test network for contract deployment, allowing for realistic testing without real economic value.
  * **Infura:** Provides robust and scalable RPC (Remote Procedure Call) access to the Sepolia network.
  * **Etherscan:** The primary blockchain explorer for Sepolia, used for contract verification, transaction monitoring, and blockchain analysis.
  * **Vercel:** A cloud platform for automatic deployment, scaling, and hosting of the React frontend application.
  * **GitHub:** The version control system and repository hosting platform for the entire monorepo.

-----

## Project Structure

This project is organized as a repo, encapsulating two primary sub-projects to maintain clear separation of concerns:

  * `hardhat/`: Dedicated to all smart contract development, including Solidity source code, deployment scripts, and comprehensive test suites.
  * `frontend/`: Houses the React-based user interface, responsible for interacting with the deployed smart contracts.

<!-- end list -->

```
SimpleSwapDApp/
├── hardhat/
│   ├── contracts/        # Solidity smart contract definitions (MyTokenA.sol, MyTokenB.sol, SimpleSwap.sol, ISimpleSwap.sol)
│   ├── scripts/          # Hardhat deployment and interaction scripts (e.g., deploy.js)
│   ├── test/             # Hardhat test files for smart contracts (e.g., SimpleSwap.test.js)
│   ├── hardhat.config.js # Hardhat project configuration
│   ├── package.json      # Hardhat dependencies and scripts
│   └── .env              # Local environment variables (Explicitly NOT committed to Git)
├── frontend/
│   ├── public/           # Static assets for React app
│   ├── src/              # React source code (App.jsx, constants/, etc.)
│   ├── package.json      # React app dependencies
│   ├── vite.config.js    # Vite build tool configuration
│   └── .env              # Local environment variables (Explicitly NOT committed to Git)
└── README.md             # The primary documentation file for the project (you are reading this)
```

-----

## Getting Started (Local Development)

To set up and run this project on your local machine for development and testing purposes, please follow the instructions below:

### Prerequisites

  * **Node.js** (version 18 or higher is recommended)
  * **npm** (version 9 or higher is recommended) or Yarn
  * **Git**
  * **MetaMask** browser extension, configured to connect to either **Sepolia Testnet** or a local Hardhat Network instance.

### 1\. Clone the Repository

Begin by cloning the project repository to your local machine:

```bash
git clone <YOUR_GITHUB_REPO_URL_HERE>
cd SimpleSwapDApp/
```

### 2\. Install Dependencies

Navigate into each sub-project directory and install their respective Node.js dependencies:

```bash
# For Hardhat smart contracts
cd hardhat/
npm install
# Alternatively, if using Yarn: yarn install
cd ../

# For React frontend application
cd frontend/
npm install
# Alternatively, if using Yarn: yarn install
cd ../
```

### 3\. Configure Environment Variables

Create `.env` files within both the `hardhat/` and `frontend/` directories. These files are essential for configuring network connections, API keys, and contract addresses. **These `.env` files should never be committed to Git for security reasons.**

  * **For Hardhat (local testing & coverage):**
    Copy the provided example file `hardhat/.env.example.local` to `hardhat/.env` and populate it with your local development environment details. This configuration is primarily used when running tests against a local Hardhat Network.

    ```bash
    cp hardhat/.env.example.local hardhat/.env
    ```

  * **For Frontend (local development):**
    Copy the provided example file `frontend/.env.example.local` to `frontend/.env` and populate it. This setup will configure your frontend to interact with a local Hardhat Network instance for development.

    ```bash
    cp frontend/.env.example.local frontend/.env
    ```

    **Note:** To test your frontend locally against the Sepolia Testnet (mimicking the live deployment), you would instead copy `frontend/.env.example` to `frontend/.env` and use your Sepolia contract addresses and Infura RPC URL.

-----

## 🧪 Running Tests & Generating Coverage

To verify the functionality and robustness of the smart contracts, execute the test suite and generate a detailed code coverage report.

1.  **Start a local Hardhat Network node (optional, but recommended for some tests):**
    Open a new terminal window and run:

    ```bash
    cd hardhat/
    npx hardhat node
    ```

    Keep this terminal window open as it simulates a local blockchain.

2.  **Execute Tests:**
    In a separate terminal window, run the comprehensive test suite for your smart contracts:

    ```bash
    cd hardhat/
    npx hardhat test
    ```

3.  **Generate Code Coverage Report:**
    After executing tests, you can generate a detailed coverage report:

    ```bash
    cd hardhat/
    npx hardhat coverage
    ```

    The report will be generated in `hardhat/coverage/index.html`. You can open this file in your web browser to review the coverage details locally.

-----

## 🌐 Smart Contract Deployment

The smart contracts for the `SimpleSwapDApp` are deployed on the **Sepolia Testnet**.

### Local Deployment (for development/testing against a local Hardhat Network)

1.  Ensure your local Hardhat node is running (`npx hardhat node` as described above).
2.  Deploy contracts to the local network:
    ```bash
    cd hardhat/
    npx hardhat run scripts/deploy.js --network localhost
    ```
    Note down the displayed contract addresses for local testing.

### Sepolia Testnet Deployment (Public - already completed for the live DApp)

*(This section outlines the process that has already been completed to deploy the contracts for the live DApp.)*

1.  Ensure your `hardhat/.env` file is configured with your `SEPOLIA_RPC_URL` (from Infura), a `PRIVATE_KEY` of a Sepolia test account (with sufficient Sepolia test ETH), and your `ETHERSCAN_API_KEY`.

2.  Deploy contracts to the Sepolia Testnet:

    ```bash
    cd hardhat/
    npx hardhat run scripts/deploy.js --network sepolia
    ```

    **IMPORTANT:** Record the addresses of the deployed `MyTokenA`, `MyTokenB`, and `SimpleSwap` contracts.

3.  **Verify Contracts on Etherscan (Sepolia):**
    For each deployed contract, submit its source code for verification. Replace `<...ADDRESS>` with the actual deployed addresses, and ensure constructor arguments are precisely matched:

      * **MyTokenA:**
        ```bash
        npx hardhat verify --network sepolia <MYTOKENA_CONTRACT_ADDRESS> --contract contracts/MyTokenA.sol:MyTokenA <RECIPIENT_ADDRESS> <INITIAL_OWNER_ADDRESS>
        ```
      * **MyTokenB:**
        ```bash
        npx hardhat verify --network sepolia <MYTOKENB_CONTRACT_ADDRESS> --contract contracts/MyTokenB.sol:MyTokenB <RECIPIENT_ADDRESS> <INITIAL_OWNER_ADDRESS>
        ```
      * **SimpleSwap:**
        ```bash
        npx hardhat verify --network sepolia <SIMPLESWAP_CONTRACT_ADDRESS> --contract contracts/SimpleSwap.sol:SimpleSwap <INITIAL_OWNER_ADDRESS>
        ```

-----

##  Running the Frontend Application

### Local Development

1.  Ensure your `frontend/.env` is configured for your desired network (either `localhost` or `sepolia` testnet).
2.  Start the React development server:
    ```bash
    cd frontend/
    npm run dev
    ```
3.  Open your web browser to `http://localhost:5173/` (or the URL provided by Vite).
4.  Connect your MetaMask wallet, ensuring it is set to the correct network (Hardhat Local or Sepolia).

### Public Deployment (Vercel)

The frontend DApp is deployed and publicly accessible via Vercel.

**Live DApp URL:** [https://tp4-frontend.vercel.app/](https://tp4-frontend.vercel.app/)

-----

## 🤝 Contact

Developed by: Jorge Enrique Cabrera

-----