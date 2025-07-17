// contracts/MaliciousReceiver.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MaliciousReceiver {
    receive() external payable {
        revert("I reject ETH!");
    }

    function executeWithdraw(address simpleSwapAddress) external {
        // Hacemos la llamada y esta vez SÍ capturamos los valores de retorno.
        (bool success, bytes memory returnData) = simpleSwapAddress.call(
            abi.encodeWithSignature("withdrawETH()")
        );

        // Si la llamada interna no tuvo éxito...
        if (!success) {
            // ...revertimos, pero pasamos la información del error original (`returnData`).
            // Esto asegura que el error de `SimpleSwap` "burbujee" hasta el test.
            assembly {
                revert(add(returnData, 32), mload(returnData))
            }
        }
    }
}