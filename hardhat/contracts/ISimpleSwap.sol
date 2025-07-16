// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title Interface for SimpleSwap
/// @notice Declares external functions for the SimpleSwap AMM contract
interface ISimpleSwap {
    /// @notice Adds liquidity to the pool for a given token pair
    /// @param tokenA The address of token A
    /// @param tokenB The address of token B
    /// @param amountADesired The amount of token A to add
    /// @param amountBDesired The amount of token B to add
    /// @param amountAMin The minimum amount of token A to add (for slippage control)
    /// @param amountBMin The minimum amount of token B to add (for slippage control)
    /// @param to The address that will receive the liquidity tokens
    /// @param deadline Unix timestamp after which the transaction will revert
    /// @return amountA The actual amount of token A added
    /// @return amountB The actual amount of token B added
    /// @return liquidity The amount of liquidity tokens minted
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    /// @notice Removes liquidity from the pool
    /// @param tokenA The address of token A
    /// @param tokenB The address of token B
    /// @param liquidity The amount of liquidity tokens to burn
    /// @param amountAMin The minimum amount of token A to receive
    /// @param amountBMin The minimum amount of token B to receive
    /// @param to The address that will receive the tokens
    /// @param deadline Unix timestamp after which the transaction will revert
    /// @return amountA The amount of token A received
    /// @return amountB The amount of token B received
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    /// @notice Swaps an exact amount of input tokens for as many output tokens as possible
    /// @param amountIn The amount of input tokens to swap
    /// @param amountOutMin The minimum amount of output tokens to receive
    /// @param path Array of token addresses (e.g., [tokenIn, tokenOut])
    /// @param to The address that will receive the output tokens
    /// @param deadline Unix timestamp after which the transaction will revert
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    /// @notice Returns the price of tokenA in terms of tokenB
    /// @param tokenA The address of token A (base token)
    /// @param tokenB The address of token B (quote token)
    /// @return price The price of tokenA denominated in tokenB, scaled by 1e18
    function getPrice(
        address tokenA,
        address tokenB
    ) external view returns (uint256 price);

    /// @notice Calculates the output amount of tokens given an input amount and reserves
    /// @param amountIn The amount of input tokens
    /// @param reserveIn The reserve amount of the input token
    /// @param reserveOut The reserve amount of the output token
    /// @return The amount of output tokens the user will receive
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external view returns (uint256);
}
