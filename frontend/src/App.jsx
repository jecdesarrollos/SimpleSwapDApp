import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css'; 

import { MYTOKENA_ABI, MYTOKENB_ABI, SIMPLESWAP_ABI } from "./constants/index.js";

const MYTOKENA_ADDRESS = import.meta.env.VITE_MYTOKENA_ADDRESS;
const MYTOKENB_ADDRESS = import.meta.env.VITE_MYTOKENB_ADDRESS;
const SIMPLESWAP_ADDRESS = import.meta.env.VITE_SIMPLESWAP_ADDRESS;
const NETWORK_ID = parseInt(import.meta.env.VITE_NETWORK_ID); // Hardhat Chain ID (31337) Sepolia (11155111)
const RPC_URL = import.meta.env.VITE_RPC_URL; 


function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkName, setNetworkName] = useState('');
  const [chainId, setChainId] = useState(null);
  // Tokens & Balances
  const [tokenAContract, setTokenAContract] = useState(null);
  const [tokenBContract, setTokenBContract] = useState(null);
  const [balanceA, setBalanceA] = useState("0");
  const [balanceB, setBalanceB] = useState("0");
  const [tokenADecimals, setTokenADecimals] = useState(18);
  const [tokenBDecimals, setTokenBDecimals] = useState(18);

  const [amountAAdd, setAmountAAdd] = useState("");
  const [amountBAdd, setAmountBAdd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [simpleSwapContract, setSimpleSwapContract] = useState(null);

  // States
  const [tokenInAmount, setTokenInAmount] = useState("");
  const [tokenOutAmount, setTokenOutAmount] = useState("0.0");
  const [tokenIn, setTokenIn] = useState(MYTOKENA_ADDRESS);
  const [tokenOut, setTokenOut] = useState(MYTOKENB_ADDRESS);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState(null);
  const [swapSuccess, setSwapSuccess] = useState(null);

  // Data and balances contract loading
  const loadContractData = useCallback(async () => {
    if (provider && account && chainId === NETWORK_ID) {
      try {
        const tokenA = new ethers.Contract(MYTOKENA_ADDRESS, MYTOKENA_ABI, provider);
        const tokenB = new ethers.Contract(MYTOKENB_ADDRESS, MYTOKENB_ABI, provider);
        setTokenAContract(tokenA);
        setTokenBContract(tokenB);

        if (signer) {
            setSimpleSwapContract(new ethers.Contract(SIMPLESWAP_ADDRESS, SIMPLESWAP_ABI, signer));
        } else {
            setSimpleSwapContract(new ethers.Contract(SIMPLESWAP_ADDRESS, SIMPLESWAP_ABI, provider));
        }

        const decA = await tokenA.decimals();
        const decB = await tokenB.decimals();
        setTokenADecimals(Number(decA));
        setTokenBDecimals(Number(decB));

        const rawBalanceA = await tokenA.balanceOf(account);
        const rawBalanceB = await tokenB.balanceOf(account);

        setBalanceA(ethers.formatUnits(rawBalanceA, decA));
        setBalanceB(ethers.formatUnits(rawBalanceB, decB));

      } catch (error) {
        console.error("Data loading error", error);
      }
    }
  }, [provider, account, chainId, signer, NETWORK_ID, MYTOKENA_ADDRESS, MYTOKENB_ADDRESS, SIMPLESWAP_ADDRESS, MYTOKENA_ABI, MYTOKENB_ABI, SIMPLESWAP_ABI]); // ABIS

  useEffect(() => {
    const initializeWeb3 = async () => {
      let currentProvider;

      if (window.ethereum) {
        currentProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(currentProvider);

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const connectedAccount = accounts[0];
          setAccount(connectedAccount);
          const currentSigner = await currentProvider.getSigner(connectedAccount);
          setSigner(currentSigner);
        }

        window.ethereum.on('accountsChanged', (newAccounts) => {
          if (newAccounts.length > 0) {
            setAccount(newAccounts[0]);
            currentProvider.getSigner(newAccounts[0]).then(setSigner);
          } else {
            setAccount(null);
            setSigner(null);
          }

        });

        window.ethereum.on('chainChanged', (newChainId) => {
          setChainId(Number(newChainId));
        });

      } else {
        console.warn("Metamask is not installed. Connecting to Hardhat Local RPC read-only.");
        currentProvider = new ethers.JsonRpcProvider(RPC_URL);
        setProvider(currentProvider);
        setAccount("0xc632E710FE2EF3CF9b19834b73c480Cb91CB32F5");
        setSigner(await currentProvider.getSigner("0xc632E710FE2EF3CF9b19834b73c480Cb91CB32F5"));
      }

      try {
        const network = await currentProvider.getNetwork();
        setNetworkName(network.name === "unknown" ? "Hardhat Local" : network.name);
        setChainId(Number(network.chainId));
      } catch (error) {
        console.error("Error getting Network:", error);
      }
    };

    initializeWeb3();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => { });
        window.ethereum.removeListener('chainChanged', () => { });
      }
    };
  }, []);

  useEffect(() => {
    loadContractData();
  }, [loadContractData]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to use this dApp with a wallet.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const connectedAccount = accounts[0];
      setAccount(connectedAccount);
      const currentSigner = await provider.getSigner(connectedAccount);
      setSigner(currentSigner);

      const network = await provider.getNetwork();
      setNetworkName(network.name === "unknown" ? "Hardhat Local" : network.name);
      setChainId(Number(network.chainId));

      if (Number(network.chainId) !== NETWORK_ID) {
        alert(`Please change your network from Metamask to Hardhat Local (Chain ID: ${NETWORK_ID}). You are here: ${network.name} (Chain ID: ${network.chainId}).`);
      }

    } catch (error) {
      console.error("Error connecting wallet.", error);
      if (error.code === 4001) {
        alert("Wallet connection rejected by user.");
      } else {
        alert("Error connecting wallet. Check the console for details.");
      }
    }
  };

  const handleApprove = async (tokenContract, amount, tokenName) => {
    if (!signer) {
        setError("There is no connected wallet to sign transactions.");
        return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
        const parsedAmount = ethers.parseUnits(amount, tokenName === "MyTokenA" ? tokenADecimals : tokenBDecimals);
        const tx = await tokenContract.connect(signer).approve(SIMPLESWAP_ADDRESS, parsedAmount);
        await tx.wait();
        setSuccess(`Approve  ${tokenName} success! Hash de Tx: ${tx.hash.substring(0, 6)}...${tx.hash.substring(tx.hash.length - 4)}`);
        await loadContractData();
    } catch (err) {
        setError(`Approving error ${tokenName}: ${err.message || err.toString()}`);
    } finally {
        setLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!signer || !tokenAContract || !tokenBContract || !simpleSwapContract) {
        setError("Wallet not connected or contracts not loaded.");
        return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
        const parsedAmountA = ethers.parseUnits(amountAAdd, tokenADecimals);
        const parsedAmountB = ethers.parseUnits(amountBAdd, tokenBDecimals);

        const deadline = Math.floor(Date.now() / 1000) + (60 * 10);

        const tx = await simpleSwapContract.addLiquidity(
            MYTOKENA_ADDRESS,
            MYTOKENB_ADDRESS,
            parsedAmountA,
            parsedAmountB,
            0,
            0,
            account,
            deadline
        );
        await tx.wait();
        setSuccess(`Liquidity added succesfully! Hash  Tx: ${tx.hash.substring(0, 6)}...${tx.hash.substring(tx.hash.length - 4)}`);
        await loadContractData();
    } catch (err) {
        setError(`Error adding liquidity: ${err.message || err.toString()}`);
    } finally {
        setLoading(false);
    }
  };

  // Función para calcular la cantidad de salida (CORREGIDA)
  const calculateAmountOut = useCallback(async () => {
    if (!simpleSwapContract || !tokenInAmount || tokenInAmount === "0" || !tokenIn || !tokenOut || !provider) {
        setTokenOutAmount("0.0");
        return;
    }

    let reserveA_Raw, reserveB_Raw;
    try {

        const simpleSwapReadContract = new ethers.Contract(SIMPLESWAP_ADDRESS, SIMPLESWAP_ABI, provider);
        [reserveA_Raw, reserveB_Raw] = await simpleSwapReadContract.getReserves(MYTOKENA_ADDRESS, MYTOKENB_ADDRESS);
    } catch (error) {
        console.error("Error getting reserves for swap calculation:", error);
        setTokenOutAmount("0.0");
        setSwapError("Error getting pool liquidity.");
        return;
    }

    let reserveIn, reserveOut;
    if (tokenIn === MYTOKENA_ADDRESS && tokenOut === MYTOKENB_ADDRESS) {
        reserveIn = reserveA_Raw;
        reserveOut = reserveB_Raw;
    } else if (tokenIn === MYTOKENB_ADDRESS && tokenOut === MYTOKENA_ADDRESS) {
        reserveIn = reserveB_Raw;
        reserveOut = reserveA_Raw;
    } else {
        setSwapError("Selección de tokens inválida para el swap.");
        setTokenOutAmount("0.0");
        return;
    }

    // If any reserve is zero, it cannot be calculated
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
        setTokenOutAmount("0.0");
        setSwapError("No hay suficiente liquidez para este par de tokens.");
        return;
    }

    let inputDecimals = tokenIn === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals;
    let outputDecimals = tokenOut === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals;

    const amountInParsed = ethers.parseUnits(tokenInAmount, inputDecimals);

    // getAmountOut
    const amountOutRaw = await simpleSwapContract.getAmountOut(amountInParsed, reserveIn, reserveOut);

    setTokenOutAmount(ethers.formatUnits(amountOutRaw, outputDecimals));
    setSwapError(null);
  }, [simpleSwapContract, tokenInAmount, tokenIn, tokenOut, tokenADecimals, tokenBDecimals, MYTOKENA_ADDRESS, MYTOKENB_ADDRESS, provider, SIMPLESWAP_ADDRESS, SIMPLESWAP_ABI]);

  useEffect(() => {
    const handler = setTimeout(() => {
      calculateAmountOut();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [tokenInAmount, tokenIn, tokenOut, calculateAmountOut]);

  const handleSwap = async () => {
    if (!signer || !simpleSwapContract || !tokenInAmount || tokenInAmount === "0" || !tokenIn || !tokenOut) {
      setSwapError("Please connect your wallet, enter an amount and select the tokens..");
      return;
    }

    setSwapLoading(true);
    setSwapError(null);
    setSwapSuccess(null);

    try {
      let inputDecimals = tokenIn === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals;
      const amountInParsed = ethers.parseUnits(tokenInAmount, inputDecimals);

      let reserveA_Raw, reserveB_Raw;
      const simpleSwapReadContract = new ethers.Contract(SIMPLESWAP_ADDRESS, SIMPLESWAP_ABI, provider);
      [reserveA_Raw, reserveB_Raw] = await simpleSwapReadContract.getReserves(MYTOKENA_ADDRESS, MYTOKENB_ADDRESS);

      let reserveIn, reserveOut;
      if (tokenIn === MYTOKENA_ADDRESS && tokenOut === MYTOKENB_ADDRESS) {
          reserveIn = reserveA_Raw;
          reserveOut = reserveB_Raw;
      } else if (tokenIn === MYTOKENB_ADDRESS && tokenOut === MYTOKENA_ADDRESS) {
          reserveIn = reserveB_Raw;
          reserveOut = reserveA_Raw;
      } else {
          setSwapError("Wrong tokens.");
          setSwapLoading(false);
          return;
      }
      
      // Llamar a getAmountOut con los parámetros CORRECTOS
      const amountOutMinRaw = await simpleSwapReadContract.getAmountOut(amountInParsed, reserveIn, reserveOut);
      const amountOutMin = amountOutMinRaw * BigInt(995) / BigInt(1000); // 0.5% de slippage

      const deadline = Math.floor(Date.now() / 1000) + (60 * 5);

      let tokenInContract;
      if (tokenIn === MYTOKENA_ADDRESS) {
        tokenInContract = tokenAContract;
      } else if (tokenIn === MYTOKENB_ADDRESS) {
        tokenInContract = tokenBContract;
      } else {
        setSwapError("Token de entrada no reconocido.");
        setSwapLoading(false);
        return;
      }

      const allowance = await tokenInContract.allowance(account, SIMPLESWAP_ADDRESS);
      if (allowance < amountInParsed) {
          setSwapSuccess(`Approving ${tokenInAmount} of ${tokenIn}...`);
          const approveTx = await tokenInContract.connect(signer).approve(SIMPLESWAP_ADDRESS, amountInParsed);
          await approveTx.wait();
          setSwapSuccess(`Approved ${tokenIn} success!`);
      }

      const tx = await simpleSwapContract.swapExactTokensForTokens(
        amountInParsed,
        amountOutMin,
        [tokenIn, tokenOut],
        account,
        deadline
      );
      await tx.wait();
      setSwapSuccess(`Swap done! Hash de Tx: ${tx.hash.substring(0, 6)}...${tx.hash.substring(tx.hash.length - 4)}`);
      setTokenInAmount("");
      setTokenOutAmount("0.0");
      await loadContractData();
    } catch (err) {
      console.error("Swap error:", err);
      let errorMessage = err.message || err.toString();
      if (errorMessage.includes("insufficient funds for gas")) {
        errorMessage = "Fondos insuficientes para gas. Asegúrate de tener ETH en tu billetera.";
      } else if (errorMessage.includes("insufficient allowance")) {
        errorMessage = "Insufficient approve. Make sure about the correct amount of tokens.";
      } else if (errorMessage.includes("STF: K")) {
        errorMessage = "Swap error: Maybe amount too high or big slippage. Try with less.";
      } else if (errorMessage.includes("STF: INVALID_PATH")) {
        errorMessage = "Error de swap: Token path invalid. Maybe liquidity.";
      }
      setSwapError(`Swap error: ${errorMessage}`);
    } finally {
      setSwapLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>SimpleSwap DApp</h1>
        <div>
          {account ? (
            <div>
              <p>Connected account: **{account.substring(0, 6)}...{account.substring(account.length - 4)}**</p>
              <p>Red: **{networkName}** (ID: {chainId})</p>
              {chainId !== NETWORK_ID && window.ethereum && (
                <p style={{ color: 'red' }}>You're on the wrong network! Switch to Hardhat Local (Chain ID: {NETWORK_ID}).</p>
              )}
            </div>
          ) : (
            <button onClick={connectWallet}>Connect Wallet</button>
          )}
        </div>
      </header>
      <main>
        {account && chainId === NETWORK_ID ? (
          <div className="dapp-container">
            <h2>Your wallet</h2>
            <p>Account: **{account.substring(0, 6)}...{account.substring(account.length - 4)}**</p>
            <p>Red: **{networkName}** (ID: {chainId})</p>
            {chainId !== NETWORK_ID && window.ethereum && (
              <p style={{ color: 'red' }}>You're on the wrong network! Switch to Hardhat Local (Chain ID: {NETWORK_ID}).</p>
            )}

            <hr />

            <h2>Your Balance</h2>
            <p>MyTokenA: **{balanceA}**</p>
            <p>MyTokenB: **{balanceB}**</p>

            <hr />

            <h2>Add Liquidity</h2>
            <div className="liquidity-section">
                <input
                    type="number"
                    placeholder="Amount MyTokenA"
                    value={amountAAdd}
                    onChange={(e) => setAmountAAdd(e.target.value)}
                    disabled={loading}
                />
                <button onClick={() => handleApprove(tokenAContract, amountAAdd, "MyTokenA")} disabled={loading || !amountAAdd}>
                    Approve MyTokenA
                </button>
                <br />
                <input
                    type="number"
                    placeholder="Amount MyTokenB"
                    value={amountBAdd}
                    onChange={(e) => setAmountBAdd(e.target.value)}
                    disabled={loading}
                />
                <button onClick={() => handleApprove(tokenBContract, amountBAdd, "MyTokenB")} disabled={loading || !amountBAdd}>
                    Approve MyTokenB
                </button>
                <br />
                <button onClick={handleAddLiquidity} disabled={loading || !amountAAdd || !amountBAdd}>
                    {loading ? "Processing..." : "Add Liquidity"}
                </button>
            </div>

            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {success && <p style={{ color: 'green' }}>Success: {success}</p>}

            <hr />

            <h2>Make Swap</h2>
            <div className="swap-section">
                <div className="input-group">
                    <input
                        type="number"
                        placeholder="Amount to exchange"
                        value={tokenInAmount}
                        onChange={(e) => setTokenInAmount(e.target.value)}
                        disabled={swapLoading}
                    />
                    <select
                        value={tokenIn}
                        onChange={(e) => {
                            setTokenIn(e.target.value);
                            if (e.target.value === tokenOut) {
                                setTokenOut(e.target.value === MYTOKENA_ADDRESS ? MYTOKENB_ADDRESS : MYTOKENA_ADDRESS);
                            }
                        }}
                        disabled={swapLoading}
                    >
                        <option value={MYTOKENA_ADDRESS}>MyTokenA</option>
                        <option value={MYTOKENB_ADDRESS}>MyTokenB</option>
                    </select>
                </div>

                <p className="swap-arrow">↓</p>

                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Estimated amount to be received"
                        value={tokenOutAmount}
                        readOnly
                        disabled={true}
                    />
                    <select
                        value={tokenOut}
                        onChange={(e) => {
                            setTokenOut(e.target.value);
                            if (e.target.value === tokenIn) {
                                setTokenIn(e.target.value === MYTOKENA_ADDRESS ? MYTOKENB_ADDRESS : MYTOKENA_ADDRESS);
                            }
                        }}
                        disabled={swapLoading}
                    >
                        <option value={MYTOKENB_ADDRESS}>MyTokenB</option>
                        <option value={MYTOKENA_ADDRESS}>MyTokenA</option>
                    </select>
                </div>

                <button onClick={handleSwap} disabled={swapLoading || !tokenInAmount || tokenInAmount === "0"}>
                    {swapLoading ? "Making Swap..." : "Swap"}
                </button>

                {swapError && <p style={{ color: 'red' }}>Swap error: {swapError}</p>}
                {swapSuccess && <p style={{ color: 'green' }}>Swap success: {swapSuccess}</p>}
            </div>

          </div>
        ) : (
          <p>Please connect your wallet to the Hardhat Local network (Chain ID: {NETWORK_ID}).</p>
        )}
      </main>
    </div>
  );
}

export default App;