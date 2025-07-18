// test/MyTokens.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MyTokenA and MyTokenB ERC20 Contracts", function () {
    // A loop to run the same suite of tests for both token contracts,
    // ensuring consistent behavior and reducing code duplication.
    ['MyTokenA', 'MyTokenB'].forEach(function (tokenName) {
        
        describe(`${tokenName} Functionality`, function () {
            let Token, token, owner, addr1;
            const FAUCET_COOLDOWN = 5 * 60; // 5 minutes in seconds

            beforeEach(async function () {
                // Deploy a fresh contract instance before each test
                [owner, addr1] = await ethers.getSigners();
                Token = await ethers.getContractFactory(tokenName);
                token = await Token.deploy(owner.address, owner.address);
            });

            describe("Faucet", function () {
                it("should allow a user to claim tokens and increase their balance", async function () {
                    // Given: A user with a zero balance
                    const balanceBefore = await token.balanceOf(addr1.address);
                    expect(balanceBefore).to.equal(0);
                    
                    const faucetAmount = await token.faucetAmount();

                    // When: The user calls the faucet function
                    await token.connect(addr1).faucet();

                    // Then: The user's balance should increase by the faucet amount
                    const balanceAfter = await token.balanceOf(addr1.address);
                    expect(balanceAfter).to.equal(faucetAmount);
                });

                it("should revert if the faucet is claimed again before the cooldown ends", async function () {
                    // Given: A user has already successfully claimed from the faucet
                    await token.connect(addr1).faucet();
                    
                    // When: The user immediately tries to claim again
                    // Then: The transaction should revert with the correct error message
                    await expect(
                        token.connect(addr1).faucet()
                    ).to.be.revertedWith("Faucet cooldown: Please wait 5 minutes.");
                });

                it("should allow claiming again after the cooldown period has passed", async function () {
                    // Given: A user has claimed and is in the cooldown period
                    await token.connect(addr1).faucet();

                    // When: The blockchain time is advanced past the cooldown period
                    await time.increase(FAUCET_COOLDOWN + 1);

                    // Then: The user should be able to successfully claim again
                    await expect(
                        token.connect(addr1).faucet()
                    ).to.not.be.reverted;
                });
            });

            describe("Minting (Owner-only)", function () {
                it("should revert if a non-owner tries to mint tokens", async function () {
                    // Given: A non-owner user (addr1)
                    const amountToMint = ethers.parseEther("100");

                    // When: The non-owner tries to call the mint function
                    // Then: The transaction should revert with the appropriate Ownable error
                    await expect(
                        token.connect(addr1).mint(addr1.address, amountToMint)
                    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
                });

                it("should allow the owner to mint new tokens to any address", async function () {
                    // Given: The contract owner and an amount to mint
                    const amountToMint = ethers.parseEther("100");
                    const balanceBefore = await token.balanceOf(addr1.address);

                    // When: The owner mints new tokens to another address (addr1)
                    await token.connect(owner).mint(addr1.address, amountToMint);

                    // Then: The recipient's balance should increase by the minted amount
                    const balanceAfter = await token.balanceOf(addr1.address);
                    expect(balanceAfter).to.equal(balanceBefore + amountToMint);
                });
            });
        });
    });
});