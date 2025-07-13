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
    //                      STATE & CONSTANTS
    // =============================================================

    /// @notice The minimum amount of liquidity burned upon pool creation.
    /// @dev This protects against initial liquidity provider price manipulation attacks.
    uint256 public constant MINIMUM_LIQUIDITY = 1e3;

    /// @notice Mapping from a sorted token pair to their reserves.
    /// @dev Access is always via `reserves[token0][token1]` where token0 is the lower address.
    mapping(address => mapping(address => PairReserves)) public reserves;

    /// @notice Struct to hold the reserves for a token pair.
    struct PairReserves {
        uint256 reserveA; // Corresponds to the reserve of the token with the lower address (_token0)
        uint256 reserveB; // Corresponds to the reserve of the token with the higher address (_token1)
    }

    // =============================================================
    //                       CUSTOM ERRORS
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
    //                         EVENTS
    // =============================================================

    /// @notice Emitted when liquidity is added to a pair.
    /// @param tokenA The address of one of the tokens in the pair.
    /// @param tokenB The address of the other token in the pair.
    /// @param amountA The amount of tokenA added.
    /// @param amountB The amount of tokenB added.
    /// @param liquidity The amount of LP tokens minted.
    event LiquidityAdded(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    /// @notice Emitted when liquidity is removed from a pair.
    /// @param tokenA The address of one of the tokens in the pair.
    /// @param tokenB The address of the other token in the pair.
    /// @param amountA The amount of tokenA returned.
    /// @param amountB The amount of tokenB returned.
    /// @param liquidity The amount of LP tokens burned.
    event LiquidityRemoved(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    /// @notice Emitted when a token swap occurs.
    /// @param tokenIn The address of the token being sent to the pool.
    /// @param tokenOut The address of the token being received from the pool.
    /// @param amountIn The amount of `tokenIn` sent.
    /// @param amountOut The amount of `tokenOut` received.
    /// @param to The final recipient of the output tokens.
    event Swapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed to
    );

    // =============================================================
    //                           MODIFIERS
    // =============================================================

    /// @notice The transaction is executed before the deadline.
    /// @param deadline The timestamp by which the transaction must be executed.
    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert SimpleSwap__Expired();
        _;
    }

    // =============================================================
    //                          CONSTRUCTOR
    // =============================================================

    /// @notice Sets the initial owner of the contract and initializes the LP token.
    /// @param initialOwner The address that will become the owner of the contract.
    constructor(
        address initialOwner
    )
        Ownable(initialOwner)
        ERC20("SimpleSwap LPToken", "LPT") // Inicializa el token LP
    {}

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
        if (tokenA == tokenB) revert SimpleSwap__IdenticalTokens();
        
        PairReserves storage pair = (tokenA < tokenB)
            ? reserves[tokenA][tokenB]
            : reserves[tokenB][tokenA];
        
        uint256 reserve0 = pair.reserveA; 
        uint256 reserve1 = pair.reserveB; 

        (amountA, amountB) = _calculateOptimalAmounts(
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            reserve0,
            reserve1,
            totalSupply()
        );

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        // Delega la lógica de acuñación de tokens de liquidez a una función auxiliar.
        // Pasa totalSupply() directamente, evitando una variable local adicional.
        liquidity = _mintLiquidityTokens(
            amountA,
            amountB,
            reserve0,
            reserve1,
            totalSupply(),
            to
        );

        // Actualiza las reservas usando la función interna unificada.
        // Pasa la referencia 'pair' directamente.
        _updateReservesInternal(
            tokenA,
            tokenB,
            int256(amountA),
            int256(amountB),
            pair
        );

        emit LiquidityAdded(tokenA, tokenB, amountA, amountB, liquidity);
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
        if (tokenA == tokenB) revert SimpleSwap__IdenticalTokens();
        PairReserves storage pair = (tokenA < tokenB)
            ? reserves[tokenA][tokenB]
            : reserves[tokenB][tokenA];

        if (liquidity == 0 || liquidity > balanceOf(msg.sender))
            revert SimpleSwap__InvalidLiquidity();      
        address _token0 = (tokenA < tokenB) ? tokenA : tokenB;

        (amountA, amountB) = _calculateAndAdjustRemovedAmounts(
            tokenA,
            _token0,
            pair, 
            liquidity,
            totalSupply()
        );

        _burn(msg.sender, liquidity);

        if (amountA < amountAMin) revert SimpleSwap__InsufficientAmountA();
        if (amountB < amountBMin) revert SimpleSwap__InsufficientAmountB();

        _updateReservesInternal(
            tokenA,
            tokenB,
            -int256(amountA),
            -int256(amountB),
            pair
        );
        _performTokenTransfers(tokenA, tokenB, amountA, amountB, to);

        _emitLiquidityRemovedEvent(tokenA, tokenB, amountA, amountB, liquidity);
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

        uint256 amountOut = 0;

        amountOut = _performSwapLogic(
            amountIn,
            amountOutMin,
            tokenIn,
            tokenOut,
            to
        );

        emit Swapped(tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // =============================================================
    //           VIEW & PURE FUNCTIONS 
    // =============================================================

    /// @notice Gets the reserves for a token pair, returned in the same order as the input tokens.
    /// @dev This function calls the internal helper `_getReservesByTokens`.
    /// @param _tokenA The address of the first token.
    /// @param _tokenB The address of the second token.
    /// @return reserveA The reserve corresponding to tokenA.
    /// @return reserveB The reserve corresponding to tokenB.
    function getReserves(
        address _tokenA,
        address _tokenB
    ) external view returns (uint256 reserveA, uint256 reserveB) {
        
        return _getReservesByTokens(_tokenA, _tokenB); // Llama a tu función interna existente
    }

    // =============================================================
    //              INTERNAL HELPER FUNCTIONS
    // =============================================================

    /// @notice Gets the reserves for a token pair, returned in the same order as the input tokens.
    /// @param _tokenA The address of the first token.
    /// @param _tokenB The address of the second token.
    /// @return reserveA The reserve corresponding to tokenA.
    /// @return reserveB The reserve corresponding to tokenB.
    function _getReservesByTokens(
        address _tokenA,
        address _tokenB
    ) internal view returns (uint256 reserveA, uint256 reserveB) {
        if (_tokenA == _tokenB) revert SimpleSwap__IdenticalTokens();
        address _token0 = (_tokenA < _tokenB) ? _tokenA : _tokenB;

        PairReserves storage pair = reserves[_token0][
            (_tokenA < _tokenB) ? _tokenB : _tokenA
        ];
        (reserveA, reserveB) = _tokenA == _token0
            ? (pair.reserveA, pair.reserveB)
            : (pair.reserveB, pair.reserveA);
    }

    /// @dev Internal helper to calculate the optimal amounts of tokens to add based on current reserves.
    /// @param amountADesired Desired amount of token A.
    /// @param amountBDesired Desired amount of token B.
    /// @param amountAMin Minimum acceptable amount of token A.
    /// @param amountBMin Minimum acceptable amount of token B.
    /// @param reserve0 Reserve of the canonical token0.
    /// @param reserve1 Reserve of the canonical token1.
    /// @param currentTotalSupply Total supply of LP tokens.
    /// @return amountA The calculated amount of token A to add.
    /// @return amountB The calculated amount of token B to add.
    function _calculateOptimalAmounts(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 reserve0,
        uint256 reserve1,
        uint256 currentTotalSupply
    ) private pure returns (uint256 amountA, uint256 amountB) {
        if (currentTotalSupply == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal = (amountADesired * reserve1) / reserve0;
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin)
                    revert SimpleSwap__InsufficientAmountB();
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = (amountBDesired * reserve0) / reserve1;
                if (amountAOptimal < amountAMin)
                    revert SimpleSwap__InsufficientAmountA();
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }
        if (amountA < amountAMin) revert SimpleSwap__InsufficientAmountA();
        if (amountB < amountBMin) revert SimpleSwap__InsufficientAmountB();
    }

    /// @dev Internal helper to mint LP tokens based on provided amounts and reserves.
    /// @param amountA Amount of token A added.
    /// @param amountB Amount of token B added.
    /// @param reserve0 Reserve of the canonical token0.
    /// @param reserve1 Reserve of the canonical token1.
    /// @param currentTotalSupply Total supply of LP tokens.
    /// @param to Recipient of LP tokens.
    /// @return liquidity The amount of LP tokens minted.
    /// @dev Internal helper to mint LP tokens based on provided amounts and reserves.
    function _mintLiquidityTokens(
        uint256 amountA,
        uint256 amountB,
        uint256 reserve0,
        uint256 reserve1,
        uint256 currentTotalSupply,
        address to // Recipient of LP tokens
    ) private returns (uint256 liquidity) {
        if (currentTotalSupply == 0) {
            liquidity = (amountA * amountB).sqrt();
            if (liquidity <= MINIMUM_LIQUIDITY)
                revert SimpleSwap__ZeroInitialLiquidity();

            liquidity = liquidity - MINIMUM_LIQUIDITY;
        } else {
            uint256 liquidity0 = (amountA * currentTotalSupply) / reserve0;
            uint256 liquidity1 = (amountB * currentTotalSupply) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }
        _mint(to, liquidity);
    }

    /// @dev Internal helper to calculate and adjust the amounts of tokens to be removed.
    /// @param _tokenA The address of token A as provided by the user.
    /// @param _canonicalToken0 The canonical token0 address (lower address).
    /// @param _pair The PairReserves storage reference.
    /// @param _liquidity The amount of LP tokens to burn.
    /// @param _currentTotalSupply The current total supply of LP tokens.
    /// @return calculatedAmountA The calculated amount of token A to return.
    /// @return calculatedAmountB The calculated amount of token B to return.
    function _calculateAndAdjustRemovedAmounts(
        address _tokenA,
        address _canonicalToken0,
        PairReserves storage _pair,
        uint256 _liquidity,
        uint256 _currentTotalSupply
    )
        private
        view
        returns (uint256 calculatedAmountA, uint256 calculatedAmountB)
    {
        calculatedAmountA = (_liquidity * _pair.reserveA) / _currentTotalSupply;
        calculatedAmountB = (_liquidity * _pair.reserveB) / _currentTotalSupply;

        if (_tokenA != _canonicalToken0) {
            (calculatedAmountA, calculatedAmountB) = (
                calculatedAmountB,
                calculatedAmountA
            );
        }
    }

    /// @dev Internal helper to update reserves (add or subtract) based on token order.
    /// @param _tokenA The address of one token in the pair.
    /// @param _tokenB The address of the other token in the pair.
    /// @param _amountAChange Change in amount for token A (can be negative).
    /// @param _amountBChange Change in amount for token B (can be negative).
    /// @param _pair The PairReserves storage reference for the pair.
    function _updateReservesInternal(
        address _tokenA,
        address _tokenB,
        int256 _amountAChange,
        int256 _amountBChange,
        PairReserves storage _pair
    ) private {
        if (_tokenA == _tokenB) revert SimpleSwap__IdenticalTokens();
        address _token0 = (_tokenA < _tokenB) ? _tokenA : _tokenB;
        if (_tokenA == _token0) {
            _pair.reserveA = uint256(int256(_pair.reserveA) + _amountAChange);
            _pair.reserveB = uint256(int256(_pair.reserveB) + _amountBChange);
        } else {
            _pair.reserveA = uint256(int256(_pair.reserveA) + _amountBChange);
            _pair.reserveB = uint256(int256(_pair.reserveB) + _amountAChange);
        }
    }

    /// @dev Internal helper to perform ERC20 token transfers.
    /// @param _tokenA The address of the first token.
    /// @param _tokenB The address of the second token.
    /// @param _amountA The amount of token A to transfer.
    /// @param _amountB The amount of token B to transfer.
    /// @param _to The recipient address.
    function _performTokenTransfers(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB,
        address _to
    ) private {
        IERC20(_tokenA).safeTransfer(_to, _amountA);
        IERC20(_tokenB).safeTransfer(_to, _amountB);
    }

    /// @dev Internal helper to emit the LiquidityRemoved event.
    /// @param tokenA The address of one of the tokens in the pair.
    /// @param tokenB The address of the other token in the pair.
    /// @param amountA The amount of tokenA returned.
    /// @param amountB The amount of tokenB returned.
    /// @param liquidity The amount of LP tokens burned.
    function _emitLiquidityRemovedEvent(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    ) private {
        emit LiquidityRemoved(tokenA, tokenB, amountA, amountB, liquidity);
    }

    /// @dev Internal helper to perform the core swap logic and token transfers.
    /// @param amountIn Amount of input token.
    /// @param amountOutMin Minimum acceptable amount of output token.
    /// @param tokenIn Address of the input token.
    /// @param tokenOut Address of the output token.
    /// @param to Recipient of output tokens.
    /// @return amountOut The calculated amount of output token.

    function _performSwapLogic(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address to
    ) private returns (uint256 amountOut) {
        if (tokenIn == tokenOut) revert SimpleSwap__IdenticalTokens();

        (uint256 reserveIn, uint256 reserveOut) = _getReservesByTokens(
            tokenIn,
            tokenOut
        );

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut < amountOutMin)
            revert SimpleSwap__InsufficientOutputAmount();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        _updateReservesInternal(
            tokenIn,
            tokenOut,
            int256(amountIn),
            -int256(amountOut),
            (tokenIn < tokenOut)
                ? reserves[tokenIn][tokenOut]
                : reserves[tokenOut][tokenIn] // <- Se usa la expresión aquí directamente
        );

        IERC20(tokenOut).safeTransfer(to, amountOut);
    }

    // =============================================================
    //              VIEW & PURE FUNCTIONS (Para interfaz y lecturas)
    // =============================================================

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
        (uint reserveA, uint reserveB) = _getReservesByTokens(tokenA, tokenB);
        if (reserveA == 0 || reserveB == 0)
            revert SimpleSwap__InsufficientLiquidity();
        price = (reserveB * 1e18) / reserveA;
    }

    // =============================================================
    //              EMERGENCY RECOVERY FUNCTIONS
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
