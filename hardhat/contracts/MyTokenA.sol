// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MyTokenA
/// @author /// @author Jorge Enrique Cabrera
/// @notice A standard ERC20 token (MTA) to be used as one part of a trading pair in the SimpleSwap protocol.
/// @dev Inherits from OpenZeppelin's ERC20 and Ownable contracts.
contract MyTokenA is ERC20, Ownable {
    // =============================================================
    //                          Faucet State
    // =============================================================

    /// @notice The amount of tokens distributed by the faucet on each claim.
    uint256 public faucetAmount = 100 * 10 ** 18;

    /// @notice The cooldown period (in seconds) between faucet claims for a single address.
    uint256 public constant FAUCET_COOLDOWN = 5 minutes;

    /// @notice A record of the last time an address claimed tokens from the faucet.
    mapping(address => uint256) public lastClaimTimestamp;

    // =============================================================
    //                           Constructor
    // =============================================================

    /// @notice Contract constructor.
    /// @dev Sets the token name, symbol, initial owner, and mints the initial supply to a specified recipient.
    /// @param recipient The address that will receive the initial supply of 1,000,000 tokens.
    /// @param initialOwner The address that will be set as the contract owner.
    constructor(
        address recipient,
        address initialOwner
    ) ERC20("MyTokenA", "MTA") Ownable(initialOwner) {
        // Mint 1,000,000 tokens to the recipient, accounting for 18 decimals.
        _mint(recipient, 1_000_000 * (10 ** decimals()));
    }

    /// @notice Creates a specified amount of new tokens and sends them to a target address.
    /// @dev This function can only be called by the contract owner. See {Ownable-onlyOwner}.
    /// @param to The address that will receive the minted tokens.
    /// @param amount The amount of tokens to mint (in the smallest unit, e.g., wei).
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // =============================================================
    //                        Public Functions
    // =============================================================

    /// @notice Allow any user claim for tokens
    /// @dev Colddown just in case of abuse
    function faucet() public {
        // Verify 5 minutes from the last claim
        require(
            block.timestamp >= lastClaimTimestamp[msg.sender] + FAUCET_COOLDOWN,
            "Faucet cooldown: Please wait 5 minutes."
        );

        // Updating the timestamp of the claim
        lastClaimTimestamp[msg.sender] = block.timestamp;

        // Minting the tokens for the msg.sender
        _mint(msg.sender, faucetAmount);
    }
}
