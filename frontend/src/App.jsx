import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Addresses and ABIs
import { MYTOKENA_ABI, MYTOKENB_ABI, SIMPLESWAP_ABI } from "./constants/index.js";
const MYTOKENA_ADDRESS = import.meta.env.VITE_MYTOKENA_ADDRESS;
const MYTOKENB_ADDRESS = import.meta.env.VITE_MYTOKENB_ADDRESS;
const SIMPLESWAP_ADDRESS = import.meta.env.VITE_SIMPLESWAP_ADDRESS;
const NETWORK_ID = parseInt(import.meta.env.VITE_NETWORK_ID, 10);

function App() {
  // States for connection, data, contracts, and balances
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkName, setNetworkName] = useState('');
  const [chainId, setChainId] = useState(null);
  const [tokenAContract, setTokenAContract] = useState(null);
  const [tokenBContract, setTokenBContract] = useState(null);
  const [simpleSwapContract, setSimpleSwapContract] = useState(null);
  const [balanceA, setBalanceA] = useState("0");
  const [balanceB, setBalanceB] = useState("0");
  const [lpTokenBalance, setLpTokenBalance] = useState("0");
  const [reserveA, setReserveA] = useState("0");
  const [reserveB, setReserveB] = useState("0");
  const [tokenADecimals, setTokenADecimals] = useState(18);
  const [tokenBDecimals, setTokenBDecimals] = useState(18);

  // States for user inputs
  const [amountAAdd, setAmountAAdd] = useState("");
  const [amountBAdd, setAmountBAdd] = useState("");
  const [tokenInAmount, setTokenInAmount] = useState("");
  const [tokenOutAmount, setTokenOutAmount] = useState("0.0");
  const [tokenIn, setTokenIn] = useState(MYTOKENA_ADDRESS);
  const [tokenOut, setTokenOut] = useState(MYTOKENB_ADDRESS);

  // States for allowances
  const [allowanceA, setAllowanceA] = useState(0n);
  const [allowanceB, setAllowanceB] = useState(0n);
  const [swapAllowance, setSwapAllowance] = useState(0n);
  
  // States for notifications
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- Data Loading ---
  const loadContractData = useCallback(async () => {
    if (!provider || !account || !signer) return;
    try {
      const tokenA = new ethers.Contract(MYTOKENA_ADDRESS, MYTOKENA_ABI, signer);
      const tokenB = new ethers.Contract(MYTOKENB_ADDRESS, MYTOKENB_ABI, signer);
      const swapContract = new ethers.Contract(SIMPLESWAP_ADDRESS, SIMPLESWAP_ABI, signer);
      setTokenAContract(tokenA);
      setTokenBContract(tokenB);
      setSimpleSwapContract(swapContract);

      const [decA, decB, lpDecimals] = await Promise.all([tokenA.decimals(), tokenB.decimals(), swapContract.decimals()]);
      setTokenADecimals(Number(decA));
      setTokenBDecimals(Number(decB));
      
      const [rawBalanceA, rawBalanceB, rawLpBalance, [rawReserveA, rawReserveB]] = await Promise.all([
        tokenA.balanceOf(account),
        tokenB.balanceOf(account),
        swapContract.balanceOf(account),
        swapContract.getReserves(MYTOKENA_ADDRESS, MYTOKENB_ADDRESS)
      ]);
      
      setBalanceA(ethers.formatUnits(rawBalanceA, decA));
      setBalanceB(ethers.formatUnits(rawBalanceB, decB));
      setLpTokenBalance(ethers.formatUnits(rawLpBalance, lpDecimals));
      setReserveA(ethers.formatUnits(rawReserveA, decA));
      setReserveB(ethers.formatUnits(rawReserveB, decB));

    } catch (err) { console.error("Error loading data:", err); }
  }, [provider, account, signer]);

  // --- Initialization and Effects ---
  useEffect(() => {
    const initialize = async () => {
      if (window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const currentSigner = await browserProvider.getSigner();
          setSigner(currentSigner);
        }
        const network = await browserProvider.getNetwork();
        setNetworkName(network.name);
        setChainId(Number(network.chainId));
        window.ethereum.on('accountsChanged', (newAccounts) => newAccounts.length > 0 ? setAccount(newAccounts[0]) : (setAccount(null), setSigner(null)));
        window.ethereum.on('chainChanged', () => window.location.reload());
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (account && signer) { loadContractData(); }
  }, [account, signer, loadContractData]);
  
  const connectWallet = async () => {
    if (!provider) return setError("MetaMask not found.");
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const currentSigner = await provider.getSigner();
        setSigner(currentSigner);
      }
    } catch (err) { setError("Failed to connect wallet."); }
  };

  // --- Allowance Checks ---
  useEffect(() => {
    const checkAllowances = async () => {
      if (!signer || !tokenAContract || !tokenBContract) return;
      try {
        const [allowA, allowB] = await Promise.all([
          tokenAContract.allowance(account, SIMPLESWAP_ADDRESS),
          tokenBContract.allowance(account, SIMPLESWAP_ADDRESS)
        ]);
        setAllowanceA(allowA);
        setAllowanceB(allowB);
        if(tokenInAmount) {
          setSwapAllowance(tokenIn === MYTOKENA_ADDRESS ? allowA : allowB);
        }
      } catch (e) { console.error("Could not check allowances", e)}
    };
    if(account) checkAllowances();
  }, [account, signer, tokenAContract, tokenBContract, tokenIn, tokenInAmount, success]);

  // --- Application Logic ---
  const handleFaucet = async (tokenContract, tokenName) => {
    if (!signer) return setError("Please connect wallet.");
    setLoading(true); setError(null); setSuccess(null);
    try {
      const tx = await tokenContract.faucet();
      await tx.wait();
      setSuccess(`Successfully claimed 100 ${tokenName}!`);
      await loadContractData();
    } catch (err) { setError(err.reason || "Faucet call failed."); }
    finally { setLoading(false); }
  };

  const handleApprove = async (tokenToApprove, amount, decimals, tokenName) => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const parsedAmount = ethers.parseUnits(amount, decimals);
      const tx = await tokenToApprove.approve(SIMPLESWAP_ADDRESS, parsedAmount);
      await tx.wait();
      setSuccess(`Approval for ${tokenName} successful!`);
    } catch(err) { setError(err.reason || `Failed to approve ${tokenName}.`); }
    finally { setLoading(false); }
  };

  const handleAddLiquidity = async () => {
    if (!signer || !amountAAdd || !amountBAdd) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const parsedAmountA = ethers.parseUnits(amountAAdd, tokenADecimals);
      const parsedAmountB = ethers.parseUnits(amountBAdd, tokenBDecimals);
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const tx = await simpleSwapContract.addLiquidity(MYTOKENA_ADDRESS, MYTOKENB_ADDRESS, parsedAmountA, parsedAmountB, 0, 0, account, deadline);
      await tx.wait();
      setSuccess("Liquidity added successfully!");
      setAmountAAdd(""); setAmountBAdd("");
      await loadContractData();
    } catch (err) { setError(err.reason || "Failed to add liquidity."); }
    finally { setLoading(false); }
  };

  const handleSwap = async () => {
    if (!signer || !tokenInAmount) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const decimals = tokenIn === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals;
      const amountInParsed = ethers.parseUnits(tokenInAmount, decimals);
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const tx = await simpleSwapContract.swapExactTokensForTokens(amountInParsed, 0, [tokenIn, tokenOut], account, deadline);
      await tx.wait();
      setSuccess("Swap executed successfully!");
      setTokenInAmount("");
      await loadContractData();
    } catch (err) { setError(err.reason || "Swap failed."); }
    finally { setLoading(false); }
  };

  const calculateAmountOut = useCallback(async () => {
    if (!simpleSwapContract || !tokenInAmount || parseFloat(tokenInAmount) <= 0) {
      setTokenOutAmount("0.0"); return;
    }
    try {
      const [reserveA, reserveB] = await simpleSwapContract.getReserves(MYTOKENA_ADDRESS, MYTOKENB_ADDRESS);
      const [reserveIn, reserveOut] = tokenIn === MYTOKENA_ADDRESS ? [reserveA, reserveB] : [reserveB, reserveA];
      if (reserveIn === 0n || reserveOut === 0n) return;
      const amountInParsed = ethers.parseUnits(tokenInAmount, tokenIn === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals);
      const amountOutRaw = await simpleSwapContract.getAmountOut(amountInParsed, reserveIn, reserveOut);
      setTokenOutAmount(ethers.formatUnits(amountOutRaw, tokenOut === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals));
    } catch (err) { console.error("Could not calculate amount out:", err); }
  }, [simpleSwapContract, tokenInAmount, tokenIn, tokenOut, tokenADecimals, tokenBDecimals]);

  useEffect(() => {
    const handler = setTimeout(() => { calculateAmountOut(); }, 300);
    return () => clearTimeout(handler);
  }, [tokenInAmount, tokenIn, tokenOut, calculateAmountOut]);
  
  // --- Render Logic ---
  const parsedAmountAAdd = ethers.parseUnits(amountAAdd || "0", tokenADecimals);
  const parsedAmountBAdd = ethers.parseUnits(amountBAdd || "0", tokenBDecimals);
  const needsApproveA = allowanceA < parsedAmountAAdd;
  const needsApproveB = allowanceB < parsedAmountBAdd;
  const parsedTokenInAmount = ethers.parseUnits(tokenInAmount || "0", tokenIn === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals);
  const needsSwapApprove = swapAllowance < parsedTokenInAmount;
  const hasSufficientBalanceForSwap = parseFloat(tokenInAmount || "0") <= parseFloat(tokenIn === MYTOKENA_ADDRESS ? balanceA : balanceB);
  const hasSufficientBalancesForLiquidity = (parseFloat(amountAAdd || "0") <= parseFloat(balanceA)) && (parseFloat(amountBAdd || "0") <= parseFloat(balanceB));

  return (
    <div className="App">
      <header className="App-header">
        <h1>SimpleSwap DApp</h1>
        {account ? (
          <div>
            <p><strong>Connected:</strong> {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
            <p><strong>Network:</strong> {networkName} (ID: {chainId})</p>
          </div>
        ) : (
          <button onClick={connectWallet} disabled={loading}>Connect Wallet</button>
        )}
      </header>
      <main>
        {account && chainId === NETWORK_ID ? (
          <div className="dapp-container">
            <div className="section">
                <h2>Your Balances</h2>
                <div className="balance-line">
                  <button className="claim-button" onClick={() => handleFaucet(tokenAContract, "MTA")} disabled={loading || !tokenAContract}>Claim MTA</button>
                  <p>MyTokenA (MTA) Balance: <strong>{parseFloat(balanceA).toFixed(4)}</strong></p>
                </div>
                <div className="balance-line">
                  <button className="claim-button" onClick={() => handleFaucet(tokenBContract, "MTB")} disabled={loading || !tokenBContract}>Claim MTB</button>
                  <p>MyTokenB (MTB) Balance: <strong>{parseFloat(balanceB).toFixed(4)}</strong></p>
                </div>
                <p>Your LP Tokens: <strong>{parseFloat(lpTokenBalance).toFixed(4)}</strong></p>
            </div>

            <div className="section pool-info">
              <h2>Pool Information</h2>
              <p>Total MTA in Pool: <strong>{parseFloat(reserveA).toFixed(4)}</strong></p>
              <p>Total MTB in Pool: <strong>{parseFloat(reserveB).toFixed(4)}</strong></p>
            </div>
            
            {loading && <p className="message">Processing transaction...</p>}
            {error && <p className="message error">Error: {error}</p>}
            {success && <p className="message success">Success: {success}</p>}
            <hr/>

            <div className="section">
                <h2>Add Liquidity</h2>
                <input type="number" placeholder="Amount of MyTokenA" value={amountAAdd} onChange={(e) => setAmountAAdd(e.target.value)} disabled={loading} />
                <input type="number" placeholder="Amount of MyTokenB" value={amountBAdd} onChange={(e) => setAmountBAdd(e.target.value)} disabled={loading} />
                <br />
                {needsApproveA && amountAAdd > 0 ? (
                  <button onClick={() => handleApprove(tokenAContract, amountAAdd, tokenADecimals, "MTA")} disabled={loading || !hasSufficientBalancesForLiquidity}>Approve MTA</button>
                ) : needsApproveB && amountBAdd > 0 ? (
                  <button onClick={() => handleApprove(tokenBContract, amountBAdd, tokenBDecimals, "MTB")} disabled={loading || !hasSufficientBalancesForLiquidity}>Approve MTB</button>
                ) : (
                  <button onClick={handleAddLiquidity} disabled={loading || !amountAAdd || !amountBAdd || !hasSufficientBalancesForLiquidity}>Add Liquidity</button>
                )}
                {!hasSufficientBalancesForLiquidity && (amountAAdd > 0 || amountBAdd > 0) && <p className="error-text">Insufficient balance to add liquidity.</p>}
            </div>

            <hr/>

            <div className="section">
                <h2>Swap Tokens</h2>
                <div className="input-group">
                    <input type="number" placeholder="Amount to swap" value={tokenInAmount} onChange={(e) => setTokenInAmount(e.target.value)} disabled={loading}/>
                    <select value={tokenIn} onChange={(e) => {setTokenIn(e.target.value); setTokenOut(e.target.value === MYTOKENA_ADDRESS ? MYTOKENB_ADDRESS : MYTOKENA_ADDRESS);}} disabled={loading}>
                        <option value={MYTOKENA_ADDRESS}>MyTokenA</option>
                        <option value={MYTOKENB_ADDRESS}>MyTokenB</option>
                    </select>
                </div>
                <div className="swap-arrow">↓</div>
                <div className="input-group">
                    <input type="text" value={parseFloat(tokenOutAmount).toFixed(5)} readOnly />
                    <select value={tokenOut} onChange={(e) => {setTokenOut(e.target.value); setTokenIn(e.target.value === MYTOKENA_ADDRESS ? MYTOKENB_ADDRESS : MYTOKENA_ADDRESS);}} disabled={loading}>
                        <option value={MYTOKENB_ADDRESS}>MyTokenB</option>
                        <option value={MYTOKENA_ADDRESS}>MyTokenA</option>
                    </select>
                </div>
                
                {needsSwapApprove && tokenInAmount > 0 ? (
                  <button onClick={() => handleApprove(tokenIn === MYTOKENA_ADDRESS ? tokenAContract : tokenBContract, tokenInAmount, tokenIn === MYTOKENA_ADDRESS ? tokenADecimals : tokenBDecimals, tokenIn === MYTOKENA_ADDRESS ? "MTA" : "MTB")} disabled={loading || !hasSufficientBalanceForSwap}>
                    Approve {tokenIn === MYTOKENA_ADDRESS ? "MTA" : "MTB"}
                  </button>
                ) : (
                  <button onClick={handleSwap} disabled={loading || !tokenInAmount || !hasSufficientBalanceForSwap || parseFloat(tokenInAmount) <= 0}>Swap</button>
                )}
                {!hasSufficientBalanceForSwap && tokenInAmount > 0 && <p className="error-text">Insufficient balance for swap.</p>}
            </div>
          </div>
        ) : (
          <p>Please connect your wallet and switch to the correct network.</p>
        )}
      </main>
    </div>
  );
}

export default App;