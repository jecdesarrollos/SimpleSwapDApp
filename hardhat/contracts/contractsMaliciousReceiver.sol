// contracts/MaliciousReceiver.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MaliciousReceiver {
    receive() external payable {
        revert("I reject ETH!");
    }

    function executeWithdraw(address simpleSwapAddress) external {
        (bool success, bytes memory returnData) = simpleSwapAddress.call(
            abi.encodeWithSignature("withdrawETH()")
        );

        if (!success) {
            assembly {
                revert(add(returnData, 32), mload(returnData))
            }
        }
    }
}