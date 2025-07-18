// contracts/SuccessResponse.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/// @title SuccessResponse
/// @author Jorge Enrique Cabrera
/// @notice A mock contract designed exclusively for testing purposes. It provides a function
/// @notice endpoint that always succeeds when called.
/// @dev This contract is used to test the success path of a low-level `.call()` in `ContractsMaliciousReceiver.sol`.
/// @dev By having an empty function body, it guarantees that the call will
/// @dev return `success = true`, allowing tests to cover branches that handle
/// @dev successful internal transactions.
contract SuccessResponse {
    	
	/// @notice A just Success Response function that intentionally does nothing to ensure a successful execution.
    /// @dev This function exists solely to be a valid target for a `.call()`. Its empty body
    /// @dev guarantees that the call will not run out of gas or revert, thus testing the
    /// @dev successful execution path of the calling contract.
	function withdrawETH() external {
    }
}