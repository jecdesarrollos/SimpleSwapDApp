// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ISimpleSwap.sol";

using Math for uint256;

/// @title SimpleSwap
/// @author Jorge Enrique Cabrera
/// @notice A self-contained Uniswap V2-style Automated Market Maker contract.
contract SimpleSwap is Ownable, ISimpleSwap, ERC20 {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STATE & CONSTANTS
    // =============================================================

    /// @notice The minimum amount of liquidity burned upon pool creation to protect against price manipulation.
    uint256 public constant MINIMUM_LIQUIDITY = 1e3;

    /// @notice Struct to hold the reserves for a token pair, ordered by token address.
    struct PairReserves {
        uint256 reserveA; // Reserve of the token with the lower address (_token0)
        uint256 reserveB; // Reserve of the token with the higher address (_token1)
    }

    /// @notice Mapping from a sorted token pair to their reserves. Access is via reserves[token0][token1].
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

    /// @notice Sets the initial owner of the contract and initializes the LP token.
    /// @param initialOwner The address that will become the owner of the contract.
    constructor(
        address initialOwner
    ) Ownable(initialOwner) ERC20("SimpleSwap LPToken", "LPT") {}

    // =============================================================
    //                         LOGIC FUNCTIONS
    // =============================================================

    /// @inheritdoc ISimpleSwap
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
        // **OPTIMIZATION:** Read reserves into memory variables once.
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

        // **REFACTOR:** Update reserves directly, avoiding passing storage pointers.
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

        // **OPTIMIZATION:** Read reserves and total supply into memory once.
        (uint256 _reserveA, uint256 _reserveB) = _getReservesByTokens(
            tokenA,
            tokenB
        );
        uint256 currentTotalSupply = totalSupply();

        // **REFACTOR:** Logic moved from _calculateAndAdjustRemovedAmounts to here.
        amountA = (liquidity * _reserveA) / currentTotalSupply;
        amountB = (liquidity * _reserveB) / currentTotalSupply;

        if (amountA < amountAMin) revert SimpleSwap__InsufficientAmountA();
        if (amountB < amountBMin) revert SimpleSwap__InsufficientAmountB();

        _burn(msg.sender, liquidity);

        // **REFACTOR:** Update reserves directly with negative values.
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

    /// @inheritdoc ISimpleSwap
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

        // **OPTIMIZATION:** Read reserves into memory variables once.
        (uint256 reserveIn, uint256 reserveOut) = _getReservesByTokens(
            tokenIn,
            tokenOut
        );

        uint256 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut < amountOutMin)
            revert SimpleSwap__InsufficientOutputAmount();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // **REFACTOR:** Update reserves directly.
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

    /// @inheritdoc ISimpleSwap
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

    /// @inheritdoc ISimpleSwap
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

    /// @dev Gets the reserves for a token pair, returned in the order of the input tokens.
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

    /// @dev Updates reserves for a pair based on the provided changes.
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

    /// @dev Calculates optimal token amounts for adding liquidity.
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

    /// @dev Mints LP tokens based on provided amounts and reserves.
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

    /// @notice Allows the contract to receive Ether.
    receive() external payable {}

    /// @notice Allows the owner to withdraw any ETH accidentally sent to this contract.
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert SimpleSwap__NoEthToWithdraw();
        (bool success, ) = owner().call{value: balance}("");
        if (!success) revert SimpleSwap__EthTransferFailed();
    }

    /// @notice Allows the owner to recover any arbitrary ERC20 token sent to this contract.
    /// @param tokenAddress The address of the ERC20 token to recover.
    function recoverERC20(address tokenAddress) external onlyOwner {
        uint256 tokenBalance = IERC20(tokenAddress).balanceOf(address(this));
        if (tokenBalance == 0) revert SimpleSwap__NoTokensToRecover();
        IERC20(tokenAddress).safeTransfer(owner(), tokenBalance);
    }
}
