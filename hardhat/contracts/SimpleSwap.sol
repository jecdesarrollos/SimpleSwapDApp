// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ISimpleSwap.sol";

using Math for uint256;

/// @title SimpleSwap - Uniswap V2-style Automated Market Maker (AMM) contract.
/// @author Jorge Enrique Cabrera
/// @notice This contract allows adding/removing liquidity and swapping between ERC20 tokens without relying on Uniswap protocol.
/// @dev Implements an AMM with LP tokens representing shares of liquidity pools.
contract SimpleSwap is Ownable, ISimpleSwap, ERC20 {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STATE & CONSTANTS
    // =============================================================

    /// @notice Minimum liquidity tokens that are permanently burned when the first liquidity is added.
    /// @dev This prevents the pool from being drained completely and protects against price manipulation.
    uint256 public constant MINIMUM_LIQUIDITY = 1e3;

    /// @notice Represents the reserves of a token pair, ordered by token address.
    /// @dev reserveA corresponds to the token with the lower address (token0).
    /// @dev reserveB corresponds to the token with the higher address (token1).
    struct PairReserves {
        uint256 reserveA; // Reserve of the token with the lower address (_token0)
        uint256 reserveB; // Reserve of the token with the higher address (_token1)
    }

    /// @notice Mapping that stores liquidity reserves for each token pair, identified by their sorted addresses.
    /// @dev Access reserves using reserves[token0][token1], where token0 and token1 are ordered addresses (token0 < token1).
    ///      Each PairReserves struct holds `reserveA` for token0 and `reserveB` for token1.
    mapping(address => mapping(address => PairReserves)) public reserves;

    // =============================================================
    //                           CUSTOM ERRORS
    // =============================================================
    error SimpleSwap__IdenticalTokens();
    error SimpleSwap__Expired();
    error SimpleSwap__InsufficientAmountA();
    error SimpleSwap__InsufficientAmountB();
    error SimpleSwap__InsufficientOutputAmount();
    error SimpleSwap__InsufficientLiquidity();
    error SimpleSwap__InvalidLiquidity();
    error SimpleSwap__ZeroInitialLiquidity();
    error SimpleSwap__InvalidPath();
    error SimpleSwap__ZeroInputAmount();
    error SimpleSwap__NoEthToWithdraw();
    error SimpleSwap__EthTransferFailed();
    error SimpleSwap__NoTokensToRecover();
    error SimpleSwap__InsufficientBalance();
    error SimpleSwap__InsufficientAllowance();
    error SimpleSwap__TokenNotInPair();
	
    // =============================================================
    //                              EVENTS
    // =============================================================

    /// @notice Emitted when liquidity is added to a pair.
    /// @param sender The address that initiated the liquidity addition.
    /// @param tokenA The address of one of the tokens in the pair.
    /// @param tokenB The address of the other token in the pair.
    /// @param amountA The amount of tokenA added.
    /// @param amountB The amount of tokenB added.
    /// @param liquidity The amount of LP tokens minted.
    event LiquidityAdded(
        address indexed sender,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    /// @notice Emitted when liquidity is removed from a pair.
    /// @param sender The address that initiated the liquidity removal.
    /// @param tokenA The address of one of the tokens in the pair.
    /// @param tokenB The address of the other token in the pair.
    /// @param amountA The amount of tokenA returned.
    /// @param amountB The amount of tokenB returned.
    /// @param liquidity The amount of LP tokens burned.
    event LiquidityRemoved(
        address indexed sender,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    /// @notice Emitted when a token swap occurs.
    /// @param sender The address that initiated the swap.
    /// @param tokenIn The address of the token being sent to the pool.
    /// @param tokenOut The address of the token being received from the pool.
    /// @param amountIn The amount of `tokenIn` sent.
    /// @param amountOut The amount of `tokenOut` received.
    /// @param to The final recipient of the output tokens.
    event Swapped(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address to
    );

    // =============================================================
    //                             MODIFIERS
    // =============================================================

    /// @notice Ensures the transaction is executed before the deadline.
    /// @param deadline The timestamp by which the transaction must be executed.
    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert SimpleSwap__Expired();
        _;
    }

    // =============================================================
    //                            CONSTRUCTOR
    // =============================================================

    /// @notice Initializes the SimpleSwap contract by setting the initial owner and
    ///         initializing the LP token with name "SimpleSwap LPToken" and symbol "LPT".
    /// @param initialOwner The address to be set as the contract owner.
    constructor(
        address initialOwner
    ) Ownable(initialOwner) ERC20("SimpleSwap LPToken", "LPT") {}

    // =============================================================
    //                         LOGIC FUNCTIONS
    // =============================================================

    /// @notice Adds liquidity to the pool for a given token pair.
    /// @dev Transfers tokens from the sender, mints LP tokens, and updates reserves.
    /// @param tokenA The address of the first token.
    /// @param tokenB The address of the second token.
    /// @param amountADesired The desired amount of tokenA to add as liquidity.
    /// @param amountBDesired The desired amount of tokenB to add as liquidity.
    /// @param amountAMin The minimum amount of tokenA to add (slippage protection).
    /// @param amountBMin The minimum amount of tokenB to add (slippage protection).
    /// @param to The address that will receive the LP tokens.
    /// @param deadline The timestamp by which the transaction must be completed.
    /// @return amountA The actual amount of tokenA added.
    /// @return amountB The actual amount of tokenB added.
    /// @return liquidity The number of LP tokens minted to the recipient.
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        override
        checkDeadline(deadline)
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        // Read reserves into memory variables once.
        (uint256 _reserveA, uint256 _reserveB) = _getReservesByTokens(
            tokenA,
            tokenB
        );
        uint256 currentTotalSupply = totalSupply();

        (amountA, amountB) = _calculateOptimalAmounts(
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            _reserveA,
            _reserveB
        );

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        liquidity = _mintLiquidityTokens(
            amountA,
            amountB,
            _reserveA,
            _reserveB,
            currentTotalSupply,
            to
        );

        // Update reserves avoiding passing storage pointers.
        _updateReserves(tokenA, tokenB, int256(amountA), int256(amountB));

        emit LiquidityAdded(
            msg.sender,
            tokenA,
            tokenB,
            amountA,
            amountB,
            liquidity
        );
    }

    /// @notice Removes liquidity from the pool and returns the corresponding amounts of tokenA and tokenB.
    /// @dev Burns the sender's liquidity tokens and transfers proportional token amounts back to the user.
    /// @param tokenA The address of tokenA in the pair.
    /// @param tokenB The address of tokenB in the pair.
    /// @param liquidity The amount of liquidity tokens to burn.
    /// @param amountAMin The minimum amount of tokenA to receive (used for slippage protection).
    /// @param amountBMin The minimum amount of tokenB to receive (used for slippage protection).
    /// @param to The address to receive the tokens.
    /// @param deadline The timestamp after which the transaction is invalid.
    /// @return amountA The actual amount of tokenA returned.
    /// @return amountB The actual amount of tokenB returned.
    /// @inheritdoc ISimpleSwap
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        override
        checkDeadline(deadline)
        returns (uint256 amountA, uint256 amountB)
    {
        if (liquidity == 0 || liquidity > balanceOf(msg.sender))
            revert SimpleSwap__InvalidLiquidity();

        // Read reserves and total supply into memory once.
        (uint256 _reserveA, uint256 _reserveB) = _getReservesByTokens(
            tokenA,
            tokenB
        );
        uint256 currentTotalSupply = totalSupply();

        amountA = (liquidity * _reserveA) / currentTotalSupply;
        amountB = (liquidity * _reserveB) / currentTotalSupply;

        if (amountA < amountAMin) revert SimpleSwap__InsufficientAmountA();
        if (amountB < amountBMin) revert SimpleSwap__InsufficientAmountB();

        _burn(msg.sender, liquidity);

        // Update reserves directly with negative values.
        _updateReserves(tokenA, tokenB, -int256(amountA), -int256(amountB));

        IERC20(tokenA).safeTransfer(to, amountA);
        IERC20(tokenB).safeTransfer(to, amountB);

        emit LiquidityRemoved(
            msg.sender,
            tokenA,
            tokenB,
            amountA,
            amountB,
            liquidity
        );
    }

    /// @notice Swaps an exact amount of input tokens for as many output tokens as possible.
    /// @dev Supports only two-token paths. Validates path, checks slippage, transfers tokens, and updates reserves.
    /// @param amountIn The exact amount of input tokens to send.
    /// @param amountOutMin The minimum amount of output tokens to receive (slippage protection).
    /// @param path The token swap path. Must be of length 2: [tokenIn, tokenOut].
    /// @param to The address to receive the output tokens.
    /// @param deadline The timestamp after which the transaction is invalid.
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override checkDeadline(deadline) {
        if (path.length != 2) revert SimpleSwap__InvalidPath();
        address tokenIn = path[0];
        address tokenOut = path[1];

        // Read reserves into memory variables once.
        (uint256 reserveIn, uint256 reserveOut) = _getReservesByTokens(
            tokenIn,
            tokenOut
        );

        uint256 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut < amountOutMin)
            revert SimpleSwap__InsufficientOutputAmount();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Update reserves directly.
        _updateReserves(
            tokenIn,
            tokenOut,
            int256(amountIn),
            -int256(amountOut)
        );

        IERC20(tokenOut).safeTransfer(to, amountOut);

        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // =============================================================
    //                    VIEW & PURE FUNCTIONS
    // =============================================================

    /**
     * @notice Calculates the output token amount for a given input, using constant product formula.
     * @dev Assumes a 0% fee for simplicity (i.e., no fee deduction like Uniswap's 0.3%).
     * @param amountIn Amount of input tokens provided.
     * @param reserveIn Reserve of the input token in the pool.
     * @param reserveOut Reserve of the output token in the pool.
     * @return amountOut The amount of output tokens received.
     * @custom:throws SimpleSwap__ZeroInputAmount If input amount is zero.
     * @custom:throws SimpleSwap__InsufficientLiquidity If either reserve is zero.
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure override returns (uint256 amountOut) {
        if (amountIn == 0) revert SimpleSwap__ZeroInputAmount();
        if (reserveIn == 0 || reserveOut == 0)
            revert SimpleSwap__InsufficientLiquidity();
        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        amountOut = numerator / denominator;
    }

    /**
     * @notice Returns the current price of tokenB in terms of tokenA (i.e., how much tokenB per 1 tokenA).
     * @dev The result is scaled by 1e18 for fixed-point precision.
     * @param tokenA The address of the base token (denominator).
     * @param tokenB The address of the quote token (numerator).
     * @return price The price of tokenB per tokenA, scaled by 1e18.
     * @custom:throws SimpleSwap__InsufficientLiquidity If reserveA is zero (to avoid division by zero).
     */
    function getPrice(
        address tokenA,
        address tokenB
    ) external view override returns (uint256 price) {
        (uint256 reserveA, uint256 reserveB) = _getReservesByTokens(
            tokenA,
            tokenB
        );
        if (reserveA == 0) revert SimpleSwap__InsufficientLiquidity();
        price = (reserveB * 1e18) / reserveA;
    }

    /// @notice Gets the reserves for a token pair, returned in the same order as the input tokens.
    /// @param _tokenA The address of the first token.
    /// @param _tokenB The address of the second token.
    /// @return reserveA The reserve corresponding to tokenA.
    /// @return reserveB The reserve corresponding to tokenB.
    function getReserves(
        address _tokenA,
        address _tokenB
    ) external view returns (uint256 reserveA, uint256 reserveB) {
        return _getReservesByTokens(_tokenA, _tokenB);
    }

    // =============================================================
    //                  INTERNAL HELPER FUNCTIONS
    // =============================================================

    /// @dev Sorts token addresses to ensure consistent order for pair identification.
    /// @param _tokenA Address of the first token.
    /// @param _tokenB Address of the second token.
    /// @return token0 The token with the lower address.
    /// @return token1 The token with the higher address.
    function _sortTokens(
        address _tokenA,
        address _tokenB
    ) private pure returns (address token0, address token1) {
        if (_tokenA == _tokenB) revert SimpleSwap__IdenticalTokens();
        (token0, token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);
    }

    /**
     * @dev Retrieves the reserves for the given token pair, returning them in the
     *      same order as the input tokens.
     * @param _tokenA The address of the first token.
     * @param _tokenB The address of the second token.
     * @return reserveA Reserve amount corresponding to _tokenA.
     * @return reserveB Reserve amount corresponding to _tokenB.
     */
    function _getReservesByTokens(
        address _tokenA,
        address _tokenB
    ) internal view returns (uint256 reserveA, uint256 reserveB) {
        (address _token0, ) = _sortTokens(_tokenA, _tokenB);
        PairReserves storage pair = reserves[_token0][
            _tokenA == _token0 ? _tokenB : _tokenA
        ];
        (reserveA, reserveB) = _tokenA == _token0
            ? (pair.reserveA, pair.reserveB)
            : (pair.reserveB, pair.reserveA);
    }

    /**
     * @dev Updates the stored reserves for a token pair by applying the given changes.
     *      The changes can be positive or negative (using signed integers) to reflect
     *      additions or subtractions of liquidity or token amounts.
     * @param _tokenA Address of the first token in the pair.
     * @param _tokenB Address of the second token in the pair.
     * @param _amountAChange Signed amount to change reserve of token A (positive to increase, negative to decrease).
     * @param _amountBChange Signed amount to change reserve of token B (positive to increase, negative to decrease).
     */
    function _updateReserves(
        address _tokenA,
        address _tokenB,
        int256 _amountAChange,
        int256 _amountBChange
    ) private {
        (address _token0, address _token1) = _sortTokens(_tokenA, _tokenB);
        PairReserves storage pair = reserves[_token0][_token1];

        (int256 change0, int256 change1) = _tokenA == _token0
            ? (_amountAChange, _amountBChange)
            : (_amountBChange, _amountAChange);

        pair.reserveA = uint256(int256(pair.reserveA) + change0);
        pair.reserveB = uint256(int256(pair.reserveB) + change1);
    }

    /**
     * @notice Calculates the optimal token amounts to be added as liquidity, maintaining the pool ratio.
     * @dev Used internally by `addLiquidity` to ensure the correct token proportions are added.
     * @param amountADesired The desired amount of token A to add.
     * @param amountBDesired The desired amount of token B to add.
     * @param amountAMin The minimum amount of token A to accept (for slippage protection).
     * @param amountBMin The minimum amount of token B to accept (for slippage protection).
     * @param reserveA The current reserve of token A in the pool.
     * @param reserveB The current reserve of token B in the pool.
     * @return amountA The actual amount of token A to add.
     * @return amountB The actual amount of token B to add.
     * @custom:throws SimpleSwap__InsufficientAmountA If the optimal amountA is below amountAMin.
     * @custom:throws SimpleSwap__InsufficientAmountB If the optimal amountB is below amountBMin.
     */
    function _calculateOptimalAmounts(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 reserveA,
        uint256 reserveB
    ) private pure returns (uint256 amountA, uint256 amountB) {
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin)
                    revert SimpleSwap__InsufficientAmountB();
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                if (amountAOptimal < amountAMin)
                    revert SimpleSwap__InsufficientAmountA();
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    /**
     * @notice Mints LP tokens based on the amount of tokens added and current pool reserves.
     * @dev Handles both initial and subsequent liquidity provisions. The first liquidity provider permanently locks `MINIMUM_LIQUIDITY`.
     * @param amountA The amount of token A added to the pool.
     * @param amountB The amount of token B added to the pool.
     * @param reserveA The current reserve of token A in the pool.
     * @param reserveB The current reserve of token B in the pool.
     * @param currentTotalSupply The total supply of LP tokens before minting.
     * @param to The address that will receive the newly minted LP tokens.
     * @return liquidity The amount of LP tokens minted.
     * @custom:throws SimpleSwap__ZeroInitialLiquidity If initial liquidity is insufficient to meet the minimum requirement.
     * @custom:throws SimpleSwap__InsufficientLiquidity If the resulting liquidity to mint is zero.
     */
    function _mintLiquidityTokens(
        uint256 amountA,
        uint256 amountB,
        uint256 reserveA,
        uint256 reserveB,
        uint256 currentTotalSupply,
        address to
    ) private returns (uint256 liquidity) {
        if (currentTotalSupply == 0) {
            // This is the first liquidity provision
            liquidity = (amountA * amountB).sqrt();
            if (liquidity <= MINIMUM_LIQUIDITY)
                revert SimpleSwap__ZeroInitialLiquidity();
            // We subtract the minimum liquidity from the user's share, effectively "burning" it.
            // DO NOT mint to address(0) as it's blocked by OpenZeppelin's ERC20 implementation.
            liquidity = liquidity - MINIMUM_LIQUIDITY;
        } else {
            // Subsequent liquidity provisions
            uint256 liquidityA = (amountA * currentTotalSupply) / reserveA;
            uint256 liquidityB = (amountB * currentTotalSupply) / reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }

        if (liquidity == 0) revert SimpleSwap__InsufficientLiquidity();

        // Mint the final liquidity amount to the recipient
        _mint(to, liquidity);
    }

    // =============================================================
    //                EMERGENCY RECOVERY FUNCTIONS
    // =============================================================

    /**
     * @notice Allows the contract to receive Ether transfers.
     * @dev This function is triggered when the contract receives ETH without data.
     * It exists to prevent accidental reverts when ETH is sent directly.
     */
    receive() external payable {}

    /**
     * @notice Allows the contract owner to withdraw any ETH accidentally sent to this contract.
     * @dev Only callable by the owner. Reverts if the contract has no ETH balance or if the transfer fails.
     * @custom:throws SimpleSwap__NoEthToWithdraw If the contract has no ETH to withdraw.
     * @custom:throws SimpleSwap__EthTransferFailed If the ETH transfer to the owner fails.
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert SimpleSwap__NoEthToWithdraw();
        (bool success, ) = owner().call{value: balance}("");
        if (!success) revert SimpleSwap__EthTransferFailed();
    }

/**
 * @notice Allows the contract owner to recover any ERC20 token accidentally sent to this contract.
 * @dev THIS IS A CRITICAL FUNCTION. It's designed to only recover tokens that are NOT part of the
 * official liquidity reserves. It calculates the surplus (balance - reserve) and transfers only that.
 * @param tokenA The address of the first token in the pair.
 * @param tokenB The address of the second token in the pair.
 * @param tokenToRecover The specific token address to recover from the pair's balance.
 * @custom:throws SimpleSwap__NoTokensToRecover If the contract's balance of the token does not exceed its reserve.
 */
function recoverERC20(address tokenA, address tokenB, address tokenToRecover) external onlyOwner {
    (uint256 reserveA, uint256 reserveB) = _getReservesByTokens(tokenA, tokenB);
    
    uint256 reserveToRecover;
    if (tokenToRecover == tokenA) {
        reserveToRecover = reserveA;
    } else if (tokenToRecover == tokenB) {
        reserveToRecover = reserveB;
    } else {
        // If the token to recover is not part of the specified pair, we can't calculate surplus.
        // For simplicity and security, we don't handle this case. 
        // A more complex implementation might check all pools, but that's gas-intensive.
        revert("SimpleSwap__TokenNotInPair"); 
    }

    uint256 totalBalance = IERC20(tokenToRecover).balanceOf(address(this));
    
    if (totalBalance <= reserveToRecover) {
        revert SimpleSwap__NoTokensToRecover();
    }

    uint256 surplus = totalBalance - reserveToRecover;
    
    IERC20(tokenToRecover).safeTransfer(owner(), surplus);
}
}
