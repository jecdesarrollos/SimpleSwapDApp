// hardhat/test/SimpleSwap.test.js

// Import Hardhat testing tools
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Define a test suite for the SimpleSwap contract
describe("SimpleSwap - Core Functionality Tests", function () {
    let SimpleSwap;
    let simpleSwap;
    let owner;
    let addr1; // Auxiliary account
    let MyTokenAContract;
    let myTokenA;
    let MyTokenBContract;
    let myTokenB;

    // Define common amounts for tests (using 18 decimals)
    const initialSupply = ethers.parseEther("1000000"); // 1,000,000 tokens
    const initialLiquidity = ethers.parseEther("10");    // 10 tokens for liquidity

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        MyTokenAContract = await ethers.getContractFactory("MyTokenA");        
        myTokenA = await MyTokenAContract.deploy(owner.address, owner.address);
        MyTokenBContract = await ethers.getContractFactory("MyTokenB");
        myTokenB = await MyTokenBContract.deploy(owner.address, owner.address);

        SimpleSwap = await ethers.getContractFactory("SimpleSwap");
        simpleSwap = await SimpleSwap.deploy(owner.address);    
    });

    // Test suite for addLiquidity function
    describe("addLiquidity", function () {
        it("should revert with SimpleSwap__ZeroInitialLiquidity if liquidity is too small", async function () {
            // MyTokenA/B tokens have 18 decimals. MINIMUM_LIQUIDITY is 1e3 (1000 units).
            // If we send 1 base unit of each token: (1 * 1).sqrt() = 1. Since 1 <= 1000, it should revert.
            await myTokenA.connect(owner).approve(simpleSwap.target, 1);
            await myTokenB.connect(owner).approve(simpleSwap.target, 1);
            await expect(
                simpleSwap.connect(owner).addLiquidity(
                    myTokenA.target, myTokenB.target, 1, 1, 0, 0, // 0 for min, because the revert is due to liquidity <= MINIMUM_LIQUIDITY
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__ZeroInitialLiquidity");
        });

        it("should revert with SimpleSwap__InsufficientAmountA (in existing pool)", async function () {
            // Setup initial liquidity (100:100)
            await myTokenA.connect(owner).approve(simpleSwap.target, ethers.parseEther("100"));
            await myTokenB.connect(owner).approve(simpleSwap.target, ethers.parseEther("100"));
            await simpleSwap.connect(owner).addLiquidity(
                myTokenA.target, myTokenB.target, ethers.parseEther("100"), ethers.parseEther("100"),
                ethers.parseEther("100"), ethers.parseEther("100"), owner.address, (await ethers.provider.getBlock("latest")).timestamp + 100
            );
            await expect(
                simpleSwap.connect(owner).addLiquidity(
                    myTokenA.target,
                    myTokenB.target,
                    ethers.parseEther("1"),    // amountADesired
                    ethers.parseEther("0.1"),  // amountBDesired
                    ethers.parseEther("0.5"),  // amountAMin (much larger than the 0.1 we would get)
                    BigInt(0),                 // amountBMin
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InsufficientAmountA");
        });

        it("should revert with SimpleSwap__InsufficientAmountB (in existing pool)", async function () {
            // Setup initial liquidity (e.g., 100 MTA and 100 MTB) for a 1:1 ratio
            await myTokenA.connect(owner).approve(simpleSwap.target, ethers.parseEther("100"));
            await myTokenB.connect(owner).approve(simpleSwap.target, ethers.parseEther("100"));
            await simpleSwap.connect(owner).addLiquidity(
                myTokenA.target, myTokenB.target, ethers.parseEther("100"), ethers.parseEther("100"),
                ethers.parseEther("100"), ethers.parseEther("100"), owner.address, (await ethers.provider.getBlock("latest")).timestamp + 100
            );

            // Scenario: We want to add a tiny amount of TokenA (0.0001 MTA)
            // This will require an equally tiny amount of TokenB (0.0001 MTB) due to 1:1 ratio.
            // But we set amountBMin much higher (0.1 MTB) to trigger InsufficientAmountB.
            // amountAMin is kept at 0 to avoid triggering InsufficientAmountA by accident.
            const tinyAmountADesired = ethers.parseEther("0.0001"); // Very small
            const highAmountBMin = ethers.parseEther("0.1"); // Much larger than 0.0001

            // Approve a small amount to allow the transaction to be attempted
            await myTokenA.connect(owner).approve(simpleSwap.target, ethers.parseEther("1"));
            await myTokenB.connect(owner).approve(simpleSwap.target, ethers.parseEther("1"));

            await expect(
                simpleSwap.connect(owner).addLiquidity(
                    myTokenA.target,
                    myTokenB.target,
                    tinyAmountADesired,          // amountADesired: This will drive amountBOptimal down
                    ethers.parseEther("1"),      // amountBDesired: Can be anything, as ADesired is limiting
                    BigInt(0),                   // amountAMin: Keep at 0 to avoid InsufficientAmountA
                    highAmountBMin,              // amountBMin: Should be greater than amountBOptimal
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InsufficientAmountB");
        });

        it("should add initial liquidity correctly and mint LP tokens", async function () {
            await myTokenA.connect(owner).approve(simpleSwap.target, initialLiquidity);
            await myTokenB.connect(owner).approve(simpleSwap.target, initialLiquidity);

            await simpleSwap.connect(owner).addLiquidity(
                myTokenA.target,
                myTokenB.target,
                initialLiquidity,
                initialLiquidity,
                initialLiquidity,
                initialLiquidity,
                owner.address,
                (await ethers.provider.getBlock("latest")).timestamp + 100
            );

            const lpBalance = await simpleSwap.balanceOf(owner.address);
            const reservesA = await myTokenA.balanceOf(simpleSwap.target);
            const reservesB = await myTokenB.balanceOf(simpleSwap.target);

            // Assertions
            expect(lpBalance).to.be.gt(0); // Should have LP tokens
            expect(reservesA).to.equal(initialLiquidity);
            expect(reservesB).to.equal(initialLiquidity);

            // Get MINIMUM_LIQUIDITY from the contract
            const minimumLiquidityFromContract = await simpleSwap.MINIMUM_LIQUIDITY();

            // Calculate the total liquidity that SHOULD have been minted (before burn)
            // This is Math.sqrt(initialLiquidity * initialLiquidity) in this initial test case
            // which would simply be initialLiquidity.
            // However, if your Math.sol is exact, then the totalSupply should be the same
            // as the perfect calculation.
            const expectedTotalLiquidityBeforeBurn = initialLiquidity; // Because sqrt(X*X) = X

            // The owner's LP balance should be the expected amount minus the burned amount.
            // We use .closeTo due to potential Math.sqrt inaccuracies with large numbers in Solidity.
            expect(lpBalance).to.be.closeTo(expectedTotalLiquidityBeforeBurn - minimumLiquidityFromContract, BigInt(1)); // Tolerance of 1 base unit
            // The tolerance BigInt(1) means we allow a difference of +-1 in the smallest unit.
        });

        it("should revert if tokens are identical", async function () {
            await expect(
                simpleSwap.connect(owner).addLiquidity(
                    myTokenA.target, // tokenA
                    myTokenA.target, // tokenB (identical)
                    initialLiquidity, initialLiquidity, initialLiquidity, initialLiquidity,
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__IdenticalTokens");
        });
    });

    // --- Tests for removeLiquidity ---
    describe("removeLiquidity", function () {
        beforeEach(async function () {
            // Set up initial liquidity to be able to remove it in removal tests
            await myTokenA.connect(owner).approve(simpleSwap.target, initialLiquidity);
            await myTokenB.connect(owner).approve(simpleSwap.target, initialLiquidity);
            await simpleSwap.connect(owner).addLiquidity(
                myTokenA.target,
                myTokenB.target,
                initialLiquidity,
                initialLiquidity,
                initialLiquidity,
                initialLiquidity,
                owner.address,
                (await ethers.provider.getBlock("latest")).timestamp + 1
            );
        });

        it("should remove liquidity correctly and return tokens", async function () {
            const lpBalanceBefore = await simpleSwap.balanceOf(owner.address);
            const tokenABalanceBefore = await myTokenA.balanceOf(owner.address);
            const tokenBBalanceBefore = await myTokenB.balanceOf(owner.address);

            // Remove all liquidity
            await simpleSwap.connect(owner).removeLiquidity(
                myTokenA.target,
                myTokenB.target,
                lpBalanceBefore, // Burn all LP tokens
                0, // No minimum amount for this test
                0, // No minimum amount for this test
                owner.address,
                (await ethers.provider.getBlock("latest")).timestamp + 1
            );

            // Assertions
            const lpBalanceAfter = await simpleSwap.balanceOf(owner.address);
            expect(lpBalanceAfter).to.equal(0); // All LP tokens burned

            const tokenABalanceAfter = await myTokenA.balanceOf(owner.address);
            const tokenBBalanceAfter = await myTokenB.balanceOf(owner.address);
            
            // Owner's balances of tokens A and B should have increased
            expect(tokenABalanceAfter).to.be.gt(tokenABalanceBefore);
            expect(tokenBBalanceAfter).to.be.gt(tokenBBalanceBefore);

            // SimpleSwap pool reserves should be very low or zero (except MINIMUM_LIQUIDITY if applicable)
            expect(await myTokenA.balanceOf(simpleSwap.target)).to.be.lt(ethers.parseEther("0.0001")); // Close to zero
            expect(await myTokenB.balanceOf(simpleSwap.target)).to.be.lt(ethers.parseEther("0.0001")); // Close to zero
        });

        it("should revert if attempting to remove liquidity with 0 LP tokens", async function () {
            await expect(
                simpleSwap.connect(owner).removeLiquidity(
                    myTokenA.target,
                    myTokenB.target,
                    0, // 0 LP tokens
                    0, 0,
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 1
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InvalidLiquidity");
        });

        it("should revert if returning TokenA amount is less than amountAMin", async function () {
            // Ensure prior liquidity setup in the beforeEach
            const lpBalance = await simpleSwap.balanceOf(owner.address);
            await expect(
                simpleSwap.connect(owner).removeLiquidity(
                    myTokenA.target, myTokenB.target, lpBalance / BigInt(2), // Remove half liquidity
                    ethers.parseEther("1000"), // amountAMin too high for what we'll get
                    0, owner.address, (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InsufficientAmountA");
        });

        it("should revert if returning TokenB amount is less than amountBMin", async function () {
            // Setup initial liquidity is handled by the `beforeEach` in this `describe` block.
            const lpBalance = await simpleSwap.balanceOf(owner.address);

            // We attempt to remove a portion of liquidity, but demand a very high amountBMin.
            // For example, if you remove half liquidity, you'll get half of the reserves.
            // If initial reserves were 10, you'll get ~5. If amountBMin is 1000, it should fail.
            await expect(
                simpleSwap.connect(owner).removeLiquidity(
                    myTokenA.target, myTokenB.target, lpBalance / BigInt(2), // Remove half liquidity
                    0,                         // amountAMin: 0 to not cause that error
                    ethers.parseEther("1000"), // amountBMin: Much more than what will be obtained from TokenB
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InsufficientAmountB");
        });
    });


    // --- Tests for swapExactTokensForTokens ---
    describe("swapExactTokensForTokens", function () {
        const swapLiquidityA = ethers.parseEther("100");
        const swapLiquidityB = ethers.parseEther("100");
        const swapAmountIn = ethers.parseEther("1"); // 1 token for the swap

        beforeEach(async function () {
            // Ensure there is liquidity in the pool for swaps
            await myTokenA.connect(owner).approve(simpleSwap.target, swapLiquidityA);
            await myTokenB.connect(owner).approve(simpleSwap.target, swapLiquidityB);
            await simpleSwap.connect(owner).addLiquidity(
                myTokenA.target,
                myTokenB.target,
                swapLiquidityA,
                swapLiquidityB,
                swapLiquidityA,
                swapLiquidityB,
                owner.address,
                (await ethers.provider.getBlock("latest")).timestamp + 1
            );
        });

        it("should swap tokens A for B correctly", async function () {
            const initialBalanceB = await myTokenB.balanceOf(owner.address);
            const reservesA = await myTokenA.balanceOf(simpleSwap.target);
            const reservesB = await myTokenB.balanceOf(simpleSwap.target);

            const expectedOut = await simpleSwap.getAmountOut(swapAmountIn, reservesA, reservesB);
            
            await myTokenA.connect(owner).approve(simpleSwap.target, swapAmountIn); // Approve tokens for the swap
            
            await simpleSwap.connect(owner).swapExactTokensForTokens(
                swapAmountIn,
                expectedOut, // amountOutMin
                [myTokenA.target, myTokenB.target], // path
                owner.address, // to
                (await ethers.provider.getBlock("latest")).timestamp + 1
            );

            const finalBalanceB = await myTokenB.balanceOf(owner.address);
            // expect(finalBalanceB).to.be.gte(initialBalanceB.add(expectedOut)); // Balance of B should have increased by at least expectedOut
            expect(finalBalanceB).to.be.gte(initialBalanceB + expectedOut);
        });

        it("should revert if path is not 2 tokens", async function () {
            await expect(
                simpleSwap.connect(owner).swapExactTokensForTokens(
                    swapAmountIn,
                    0,
                    [myTokenA.target], // Invalid path: only 1 token
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 1
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InvalidPath");
        });

        it("should revert if amountOut is less than amountOutMin", async function () {
            const reservesA = await myTokenA.balanceOf(simpleSwap.target);
            const reservesB = await myTokenB.balanceOf(simpleSwap.target);
            const actualExpectedOut = await simpleSwap.getAmountOut(swapAmountIn, reservesA, reservesB);

            await myTokenA.connect(owner).approve(simpleSwap.target, swapAmountIn);

            await expect(
                simpleSwap.connect(owner).swapExactTokensForTokens(
                    swapAmountIn,
                    actualExpectedOut + BigInt(1), // Request 1 more than what will actually be obtained
                    [myTokenA.target, myTokenB.target],
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 1
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InsufficientOutputAmount");
        });
        
        it("should revert if amountIn is zero", async function () {
            await expect(
                simpleSwap.connect(owner).swapExactTokensForTokens(
                    0, // amountIn = 0
                    0,
                    [myTokenA.target, myTokenB.target],
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__ZeroInputAmount");
        });

        it("should revert if there is no liquidity in the pool", async function () {
            // Deploy a new SimpleSwap without liquidity
            const freshSimpleSwap = await SimpleSwap.deploy(owner.address);
            await expect(
                freshSimpleSwap.connect(owner).swapExactTokensForTokens(
                    ethers.parseEther("1"), 0,
                    [myTokenA.target, myTokenB.target],
                    owner.address,
                    (await ethers.provider.getBlock("latest")).timestamp + 100
                )
            ).to.be.revertedWithCustomError(freshSimpleSwap, "SimpleSwap__InsufficientLiquidity");
        });
    });

    // --- Tests for getPrice and getAmountOut ---
    describe("View Functions", function () {
        const viewLiquidityA = ethers.parseEther("1000");
        const viewLiquidityB = ethers.parseEther("2000"); // 1:2 ratio

        beforeEach(async function () {
            // Add liquidity with a known ratio for price tests
            await myTokenA.connect(owner).approve(simpleSwap.target, viewLiquidityA);
            await myTokenB.connect(owner).approve(simpleSwap.target, viewLiquidityB);
            await simpleSwap.connect(owner).addLiquidity(
                myTokenA.target,
                myTokenB.target,
                viewLiquidityA,
                viewLiquidityB,
                viewLiquidityA,
                viewLiquidityB,
                owner.address,
                (await ethers.provider.getBlock("latest")).timestamp + 1
            );
        });

        it("getPrice should return the correct price", async function () {
            const expectedPrice = (viewLiquidityB * ethers.parseEther("1")) / viewLiquidityA; // B/A * 1e18
            const price = await simpleSwap.getPrice(myTokenA.target, myTokenB.target);
            expect(price).to.equal(expectedPrice);

            // Test the price in the other direction
            const expectedPriceReverse = (viewLiquidityA * ethers.parseEther("1")) / viewLiquidityB; // A/B * 1e18
            const priceReverse = await simpleSwap.getPrice(myTokenB.target, myTokenA.target);
            expect(priceReverse).to.equal(expectedPriceReverse);
        });



        it("getAmountOut should calculate the output amount correctly", async function () {
            const reservesA = await myTokenA.balanceOf(simpleSwap.target);
            const reservesB = await myTokenB.balanceOf(simpleSwap.target);
            const amountInTest = ethers.parseEther("5"); // 5 input tokens

            // Uniswap v2 formula: (amountIn * reserveOut) / (reserveIn + amountIn)
            const expectedAmountOut = (amountInTest * reservesB) / (reservesA + amountInTest);
            
            const calculatedAmountOut = await simpleSwap.getAmountOut(amountInTest, reservesA, reservesB);
            expect(calculatedAmountOut).to.equal(expectedAmountOut);
        });
    });
});