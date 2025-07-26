// Import Hardhat and testing utilities
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// The main test suite for the SimpleSwap contract.
// All tests related to this contract will be nested inside this block.
describe("SimpleSwap - Core Functionality Tests", function () {
  // --- Test Suite State Variables ---
  // These variables are declared here to be accessible across all tests (`it` blocks)
  // within this suite. They will be assigned values in the `beforeEach` hook.
  let SimpleSwap; // The contract factory for SimpleSwap
  let simpleSwap; // The deployed instance of the SimpleSwap contract
  let owner; // The primary account (signer) for tests, usually the deployer/owner
  let addr1; // A secondary account (signer) for tests
  let MyTokenAContract; // The contract factory for MyTokenA
  let myTokenA; // The deployed instance of the MyTokenA contract
  let MyTokenBContract; // The contract factory for MyTokenB
  let myTokenB; // The deployed instance of the MyTokenB contract

  // --- Constants ---
  // Define common, fixed values here to ensure consistency and readability in tests.
  const initialSupply = ethers.parseEther("1000000"); // 1,000,000 tokens (used in mock token constructors)
  const initialLiquidity = ethers.parseEther("10"); // A standard amount for providing liquidity in tests

  // --- Test Setup Hook ---
  // This function runs before every single `it` block in this `describe` suite.
  // Its purpose is to reset the state and provide a clean, isolated environment for each test.
  beforeEach(async function () {
    // 1. Get Signers: Load the test accounts provided by Hardhat.
    [owner, addr1] = await ethers.getSigners();

    // 2. Load Contract Factories: Prepare the "blueprints" for deploying our contracts.
    MyTokenAContract = await ethers.getContractFactory("MyTokenA");
    MyTokenBContract = await ethers.getContractFactory("MyTokenB");
    SimpleSwap = await ethers.getContractFactory("SimpleSwap");

    // 3. Deploy Fresh Contracts: Create new instances of the contracts for the upcoming test.
    // This ensures that the state from a previous test does not affect the current one.
    myTokenA = await MyTokenAContract.deploy(owner.address, owner.address);
    myTokenB = await MyTokenBContract.deploy(owner.address, owner.address);
    simpleSwap = await SimpleSwap.deploy(owner.address);
  });

  describe("addLiquidity", function () {
    // =============================================================
    // SECTION: Revert Scenarios
    // These tests confirm that the function reverts under invalid conditions.
    // =============================================================
    describe("Revert Scenarios", function () {
      it("should revert if initial liquidity is too small", async function () {
        // Given: The user has approved a negligible amount of tokens
        await myTokenA.approve(simpleSwap.target, 1);
        await myTokenB.approve(simpleSwap.target, 1);

        // When: They try to add liquidity below the MINIMUM_LIQUIDITY threshold
        // Then: The transaction must revert
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            1,
            1,
            0,
            0,
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__ZeroInitialLiquidity"
        );
      });

    it("should add liquidity correctly when tokens are provided in flipped order (B, A)", async function () {
    // Given: Amounts for a new pool and approved tokens
    const amountA = ethers.parseEther("50");
    const amountB = ethers.parseEther("50");
    await myTokenA.approve(simpleSwap.target, amountA);
    await myTokenB.approve(simpleSwap.target, amountB);

    // When: Liquidity is added with Token B as the first argument
    await simpleSwap.addLiquidity(
        myTokenB.target, // Flipped order
        myTokenA.target, // Flipped order
        amountB,
        amountA,
        0,
        0,
        owner.address,
        (await time.latest()) + 100
    );

    // Then: The reserves should be updated correctly regardless of input order
    const [reserveA, reserveB] = await simpleSwap.getReserves(myTokenA.target, myTokenB.target);
    expect(reserveA).to.equal(amountA);
    expect(reserveB).to.equal(amountB);
    });

      it("should revert if tokens are identical", async function () {
        // When: A user tries to create a pool with the same token for both sides
        // Then: The transaction must revert
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenA.target,
            1,
            1,
            0,
            0,
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__IdenticalTokens"
        );
      });

      it("should revert if the deadline has passed", async function () {
        // Given: A deadline set in the past
        const deadline = (await time.latest()) + 100;
        await time.increase(101); // Time-travel past the deadline

        // When: A user tries to add liquidity
        // Then: The transaction must revert due to the checkDeadline modifier
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            1,
            1,
            0,
            0,
            owner.address,
            deadline
          )
        ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__Expired");
      });

      it("should revert on slippage if amountA is less than amountAMin", async function () {
        // Given: A pool with a 1:2 ratio (100 A : 200 B)
        await myTokenA.approve(simpleSwap.target, ethers.MaxUint256);
        await myTokenB.approve(simpleSwap.target, ethers.MaxUint256);
        await simpleSwap.addLiquidity(
          myTokenA.target,
          myTokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          0,
          0,
          owner.address,
          (await time.latest()) + 100
        );

        // When: A user tries to add 10 B, which would require 5 A, but they demand a minimum of 6 A
        // Then: The transaction must revert
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            ethers.parseEther("10"),
            ethers.parseEther("10"),
            ethers.parseEther("6"),
            0,
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InsufficientAmountA"
        );
      });

      it("should revert on slippage if amountB is less than amountBMin", async function () {
        // Given: A pool with a 1:1 ratio
        await myTokenA.approve(simpleSwap.target, ethers.MaxUint256);
        await myTokenB.approve(simpleSwap.target, ethers.MaxUint256);
        await simpleSwap.addLiquidity(
          myTokenA.target,
          myTokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          0,
          0,
          owner.address,
          (await time.latest()) + 100
        );

        // When: A user adds 10 A (requiring 10 B), but demands a minimum of 11 B
        // Then: The transaction must revert
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            ethers.parseEther("10"),
            ethers.parseEther("10"),
            0,
            ethers.parseEther("11"),
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InsufficientAmountB"
        );
      });
    });

    // =============================================================
    // SECTION: Logic & Calculation Scenarios
    // These tests confirm the core logic works as expected.
    // =============================================================
    describe("Logic & Calculation Scenarios", function () {
      it("should mint initial liquidity correctly and emit event", async function () {
        // Given: Amounts for a new pool and approved tokens
        const amount = ethers.parseEther("100");
        await myTokenA.approve(simpleSwap.target, amount);
        await myTokenB.approve(simpleSwap.target, amount);

        // Calculation for expected LP tokens, considering the locked MINIMUM_LIQUIDITY
        const minimumLiquidity = await simpleSwap.MINIMUM_LIQUIDITY();
        const expectedLiquidity = amount - minimumLiquidity;

        // When: Initial liquidity is added
        // Then: An event should be emitted with the correct parameters
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            amount,
            amount,
            0,
            0,
            owner.address,
            (await time.latest()) + 100
          )
        )
          .to.emit(simpleSwap, "LiquidityAdded")
          .withArgs(
            owner.address,
            myTokenA.target,
            myTokenB.target,
            amount,
            amount,
            expectedLiquidity
          );
      });

      it("should mint correctly when Token A provides the smaller proportional share", async function () {
        // Given: An existing pool with a 1:1 ratio
        await myTokenA.approve(simpleSwap.target, ethers.MaxUint256);
        await myTokenB.approve(simpleSwap.target, ethers.MaxUint256);
        await simpleSwap.addLiquidity(
          myTokenA.target,
          myTokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          0,
          0,
          owner.address,
          (await time.latest()) + 100
        );

        // When: A user adds liquidity where the proportion of Token A (10%) is less than Token B (20%)
        // Then: The transaction should succeed, proving the contract correctly chose Token A as the limit
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            ethers.parseEther("10"),
            ethers.parseEther("20"),
            0,
            0,
            owner.address,
            (await time.latest()) + 100
          )
        ).to.emit(simpleSwap, "LiquidityAdded");
      });

      it("should mint correctly when Token B is the limiting factor", async function () {
        // Given: An existing pool with a 2:1 ratio (200 A : 100 B)
        await myTokenA.approve(simpleSwap.target, ethers.MaxUint256);
        await myTokenB.approve(simpleSwap.target, ethers.MaxUint256);
        await simpleSwap.addLiquidity(
          myTokenA.target,
          myTokenB.target,
          ethers.parseEther("200"),
          ethers.parseEther("100"),
          0,
          0,
          owner.address,
          (await time.latest()) + 100
        );

        // When: A user wants to add 20 A (which requires 10 B) but only provides 5 B
        const amountADesired = ethers.parseEther("20");
        const amountBDesired = ethers.parseEther("5"); // <-- The limiting amount

        // Then: The contract should take all 5 B and calculate the proportional amount of A (10)
        const expectedAmountA = ethers.parseEther("10");
        const expectedAmountB = amountBDesired;

        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            amountADesired,
            amountBDesired,
            0,
            0,
            owner.address,
            (await time.latest()) + 100
          )
        )
          .to.emit(simpleSwap, "LiquidityAdded")
          .withArgs(
            owner.address,
            myTokenA.target,
            myTokenB.target,
            expectedAmountA,
            expectedAmountB,
            (liquidity) => liquidity > 0
          );
      });

      it("should revert if calculated liquidity to mint is zero due to tiny amounts", async function () {
        // Given: A pool with very large reserves
        const largeAmount = ethers.parseEther("10000");
        await myTokenA.approve(simpleSwap.target, ethers.MaxUint256);
        await myTokenB.approve(simpleSwap.target, ethers.MaxUint256);
        await simpleSwap.addLiquidity(
          myTokenA.target,
          myTokenB.target,
          largeAmount,
          largeAmount,
          0,
          0,
          owner.address,
          (await time.latest()) + 100
        );

        // When: A user tries to add a minuscule amount (1 wei)
        // Then: The calculated liquidity will be 0 due to integer division, and it should revert
        await expect(
          simpleSwap.addLiquidity(
            myTokenA.target,
            myTokenB.target,
            1,
            1,
            0,
            0,
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InsufficientLiquidity"
        );
      });
    });
  });

  describe("removeLiquidity", function () {
    // This hook runs before each test in THIS describe block.
    // It ensures that a liquidity pool exists, so we don't have to create it in every test.
    beforeEach(async function () {
      await myTokenA.approve(simpleSwap.target, initialLiquidity);
      await myTokenB.approve(simpleSwap.target, initialLiquidity);
      await simpleSwap.addLiquidity(
        myTokenA.target,
        myTokenB.target,
        initialLiquidity,
        initialLiquidity,
        0,
        0,
        owner.address,
        (await time.latest()) + 100
      );
    });

it("should remove liquidity correctly when tokens are provided in flipped order (B, A)", async function () {
    // Given: The user's current LP balance and initial token balances
    const lpBalance = await simpleSwap.balanceOf(owner.address);
    const tokenABalance_before = await myTokenA.balanceOf(owner.address);
    const tokenBBalance_before = await myTokenB.balanceOf(owner.address);

    // When: The user removes all of their liquidity, calling the function with token B first
    await simpleSwap.removeLiquidity(
        myTokenB.target, // Flipped order
        myTokenA.target, // Flipped order
        lpBalance,
        0,
        0,
        owner.address,
        (await time.latest()) + 100
    );

    // Then: The user's final balances should have increased, proving the transfers were successful
    const lpBalance_after = await simpleSwap.balanceOf(owner.address);
    expect(lpBalance_after).to.equal(0);

    const tokenABalance_after = await myTokenA.balanceOf(owner.address);
    const tokenBBalance_after = await myTokenB.balanceOf(owner.address);
    expect(tokenABalance_after).to.be.gt(tokenABalance_before);
    expect(tokenBBalance_after).to.be.gt(tokenBBalance_before);
});

it("should remove liquidity correctly when tokens are provided in flipped order (B, A)", async function () {
        // Given: The user's current LP balance and initial token balances
        const lpBalance = await simpleSwap.balanceOf(owner.address);
        const tokenABalance_before = await myTokenA.balanceOf(owner.address);
        const tokenBBalance_before = await myTokenB.balanceOf(owner.address);

        // When: The user removes all of their liquidity, calling the function with token B first
        await simpleSwap.removeLiquidity(
            myTokenB.target, // Flipped order
            myTokenA.target, // Flipped order
            lpBalance,
            0,
            0,
            owner.address,
            (await time.latest()) + 100
        );

        // Then: The user's final balances should have increased, proving the transfers were successful
        const lpBalance_after = await simpleSwap.balanceOf(owner.address);
        expect(lpBalance_after).to.equal(0);

        const tokenABalance_after = await myTokenA.balanceOf(owner.address);
        const tokenBBalance_after = await myTokenB.balanceOf(owner.address);
        expect(tokenABalance_after).to.be.gt(tokenABalance_before);
        expect(tokenBBalance_after).to.be.gt(tokenBBalance_before);
    });

    it("should correctly remove liquidity, update balances, and emit a LiquidityRemoved event", async function () {
      // Given: The state of the user's balances and the pool's reserves
      const tokenABalance_before = await myTokenA.balanceOf(owner.address);
      const tokenBBalance_before = await myTokenB.balanceOf(owner.address);
      const lpBalance = await simpleSwap.balanceOf(owner.address);
      const totalSupply = await simpleSwap.totalSupply();
      const reserves = await simpleSwap.getReserves(
        myTokenA.target,
        myTokenB.target
      );

      // We calculate the expected return amounts by mirroring the contract's own formula.
      const expectedAmountA = (lpBalance * reserves[0]) / totalSupply;
      const expectedAmountB = (lpBalance * reserves[1]) / totalSupply;

      // When: The user removes all of their liquidity
      // Then: The correct event should be emitted with the calculated amounts
      await expect(
        simpleSwap
          .connect(owner)
          .removeLiquidity(
            myTokenA.target,
            myTokenB.target,
            lpBalance,
            0,
            0,
            owner.address,
            (await time.latest()) + 100
          )
      )
        .to.emit(simpleSwap, "LiquidityRemoved")
        .withArgs(
          owner.address,
          myTokenA.target,
          myTokenB.target,
          expectedAmountA,
          expectedAmountB,
          lpBalance
        );

      // And Then: The user's final balances should be updated correctly
      const lpBalance_after = await simpleSwap.balanceOf(owner.address);
      expect(lpBalance_after).to.equal(0);

      const tokenABalance_after = await myTokenA.balanceOf(owner.address);
      const tokenBBalance_after = await myTokenB.balanceOf(owner.address);
      expect(tokenABalance_after).to.be.gt(tokenABalance_before);
      expect(tokenBBalance_after).to.be.gt(tokenBBalance_before);
    });

    // =============================================================
    // SECTION: Revert Scenarios
    // =============================================================
    describe("Revert Scenarios", function () {
      it("should revert if trying to remove zero liquidity", async function () {
        // When: A user tries to remove 0 LP tokens
        // Then: The transaction must revert
        await expect(
          simpleSwap
            .connect(owner)
            .removeLiquidity(
              myTokenA.target,
              myTokenB.target,
              0,
              0,
              0,
              owner.address,
              (await time.latest()) + 100
            )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InvalidLiquidity"
        );
      });

      it("should revert if trying to remove more liquidity than owned", async function () {
        // Given: The user's current LP token balance
        const lpBalance = await simpleSwap.balanceOf(owner.address);

        // When: The user tries to remove more LP tokens than they have
        const amountToRemove = lpBalance + BigInt(1);

        // Then: The transaction must revert
        await expect(
          simpleSwap
            .connect(owner)
            .removeLiquidity(
              myTokenA.target,
              myTokenB.target,
              amountToRemove,
              0,
              0,
              owner.address,
              (await time.latest()) + 100
            )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InvalidLiquidity"
        );
      });

      it("should revert on slippage if returned amountA is less than amountAMin", async function () {
        // Given: The user wants to remove half of their liquidity
        const lpBalance = await simpleSwap.balanceOf(owner.address);
        const amountToRemove = lpBalance / BigInt(2);

        // When: They set an impossibly high minimum for Token A
        const highAmountAMin = ethers.parseEther("1000");

        // Then: The transaction must revert
        await expect(
          simpleSwap
            .connect(owner)
            .removeLiquidity(
              myTokenA.target,
              myTokenB.target,
              amountToRemove,
              highAmountAMin,
              0,
              owner.address,
              (await time.latest()) + 100
            )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InsufficientAmountA"
        );
      });

      it("should revert on slippage if returned amountB is less than amountBMin", async function () {
        // Given: The user wants to remove half of their liquidity
        const lpBalance = await simpleSwap.balanceOf(owner.address);
        const amountToRemove = lpBalance / BigInt(2);

        // When: They set an impossibly high minimum for Token B
        const highAmountBMin = ethers.parseEther("1000");

        // Then: The transaction must revert
        await expect(
          simpleSwap
            .connect(owner)
            .removeLiquidity(
              myTokenA.target,
              myTokenB.target,
              amountToRemove,
              0,
              highAmountBMin,
              owner.address,
              (await time.latest()) + 100
            )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InsufficientAmountB"
        );
      });

      it("should revert when the deadline has passed", async function () {
        // Given: A deadline set in the past
        const lpBalance = await simpleSwap.balanceOf(owner.address);
        const deadline = (await time.latest()) + 100;
        await time.increase(101);

        // When: The user tries to remove liquidity
        // Then: The transaction must revert
        await expect(
          simpleSwap
            .connect(owner)
            .removeLiquidity(
              myTokenA.target,
              myTokenB.target,
              lpBalance,
              0,
              0,
              owner.address,
              deadline
            )
        ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__Expired");
      });
    });
  });

  describe("swapExactTokensForTokens", function () {
    // Constants for this specific suite of tests
    const SWAP_LIQUIDITY = ethers.parseEther("100");
    const AMOUNT_TO_SWAP = ethers.parseEther("1");

    // This hook runs before each test in THIS describe block,
    // ensuring a pool with 100 of each token is ready for swapping.
    beforeEach(async function () {
      await myTokenA.approve(simpleSwap.target, SWAP_LIQUIDITY);
      await myTokenB.approve(simpleSwap.target, SWAP_LIQUIDITY);
      await simpleSwap.addLiquidity(
        myTokenA.target,
        myTokenB.target,
        SWAP_LIQUIDITY,
        SWAP_LIQUIDITY,
        0,
        0,
        owner.address,
        (await time.latest()) + 100
      );
    });

    it("should swap tokens correctly when the input token has a higher address (B -> A)", async function () {
    // Given: The user wants to swap Token B for Token A
    const amountToSwapB = ethers.parseEther("1");
    await myTokenB.approve(simpleSwap.target, amountToSwapB);
    const initialBalanceA = await myTokenA.balanceOf(owner.address);

    // Calculate expected output
    const reserves = await simpleSwap.getReserves(myTokenB.target, myTokenA.target);
    const expectedAmountOut = await simpleSwap.getAmountOut(amountToSwapB, reserves[0], reserves[1]);

    // When: The user performs the swap from B to A
    await simpleSwap.swapExactTokensForTokens(
        amountToSwapB,
        0,
        [myTokenB.target, myTokenA.target], // Flipped path
        owner.address,
        (await time.latest()) + 100
    );

    // Then: The user's balance of Token A should increase
    const finalBalanceA = await myTokenA.balanceOf(owner.address);
    expect(finalBalanceA).to.be.closeTo(initialBalanceA + expectedAmountOut, 1);
   });

    it("should swap tokens correctly when the input token has a higher address (B -> A)", async function () {
        // Given: The user wants to swap Token B for Token A
        const amountToSwapB = ethers.parseEther("1");
        await myTokenB.approve(simpleSwap.target, amountToSwapB);
        const initialBalanceA = await myTokenA.balanceOf(owner.address);

        // Calculate expected output
        const reserves = await simpleSwap.getReserves(myTokenB.target, myTokenA.target);
        const expectedAmountOut = await simpleSwap.getAmountOut(amountToSwapB, reserves[0], reserves[1]);

        // When: The user performs the swap from B to A
        await expect(
            simpleSwap.swapExactTokensForTokens(
                amountToSwapB,
                0,
                [myTokenB.target, myTokenA.target], // Note the flipped order in the path
                owner.address,
                (await time.latest()) + 100
            )
        ).to.emit(simpleSwap, "Swapped");

        // Then: The user's balance of Token A should increase
        const finalBalanceA = await myTokenA.balanceOf(owner.address);
        expect(finalBalanceA).to.be.closeTo(initialBalanceA + expectedAmountOut, 1);
    });

    it("should swap tokens correctly, update balances, and emit a Swapped event", async function () {
      // Given: The user's initial balance and the expected output for the swap
      const initialBalanceB = await myTokenB.balanceOf(owner.address);
      const reserves = await simpleSwap.getReserves(
        myTokenA.target,
        myTokenB.target
      );
      const expectedAmountOut = await simpleSwap.getAmountOut(
        AMOUNT_TO_SWAP,
        reserves[0],
        reserves[1]
      );
      await myTokenA.approve(simpleSwap.target, AMOUNT_TO_SWAP);

      // When: The user performs a swap with a valid deadline
      // Then: The correct "Swapped" event should be emitted
      await expect(
        simpleSwap.swapExactTokensForTokens(
          AMOUNT_TO_SWAP,
          0, // No slippage protection for this happy path test
          [myTokenA.target, myTokenB.target],
          owner.address,
          (await time.latest()) + 100
        )
      )
        .to.emit(simpleSwap, "Swapped")
        .withArgs(
          owner.address,
          myTokenA.target,
          myTokenB.target,
          AMOUNT_TO_SWAP,
          expectedAmountOut,
          owner.address
        );

      // And Then: The user's final balance of Token B should have increased correctly
      const finalBalanceB = await myTokenB.balanceOf(owner.address);
      expect(finalBalanceB).to.be.closeTo(
        initialBalanceB + expectedAmountOut,
        1
      );
    });

    // =============================================================
    // SECTION: Revert Scenarios
    // =============================================================
    describe("Revert Scenarios", function () {
      it("should revert if the deadline has passed", async function () {
        // Given: A deadline set in the past
        await myTokenA.approve(simpleSwap.target, AMOUNT_TO_SWAP);
        const deadline = (await time.latest()) + 100;
        await time.increase(101);

        // When: The user tries to swap
        // Then: The transaction must revert
        await expect(
          simpleSwap.swapExactTokensForTokens(
            AMOUNT_TO_SWAP,
            0,
            [myTokenA.target, myTokenB.target],
            owner.address,
            deadline
          )
        ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__Expired");
      });

      it("should revert if the swap path length is invalid", async function () {
        // When: A user provides a path with less than 2 tokens
        // Then: The transaction must revert
        await expect(
          simpleSwap.swapExactTokensForTokens(
            AMOUNT_TO_SWAP,
            0,
            [myTokenA.target],
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__InvalidPath");
      });

      it("should revert if output amount is less than the minimum required (slippage)", async function () {
        // Given: The expected output for a swap
        const reserves = await simpleSwap.getReserves(
          myTokenA.target,
          myTokenB.target
        );
        const expectedAmountOut = await simpleSwap.getAmountOut(
          AMOUNT_TO_SWAP,
          reserves[0],
          reserves[1]
        );
        await myTokenA.approve(simpleSwap.target, AMOUNT_TO_SWAP);

        // When: The user requires an amount greater than what the pool can provide
        const impossibleAmountOutMin = expectedAmountOut + BigInt(1);

        // Then: The transaction must revert
        await expect(
          simpleSwap.swapExactTokensForTokens(
            AMOUNT_TO_SWAP,
            impossibleAmountOutMin,
            [myTokenA.target, myTokenB.target],
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__InsufficientOutputAmount"
        );
      });

      it("should revert if the input amount is zero", async function () {
        // When: A user tries to swap 0 tokens
        // Then: The transaction must revert
        await expect(
          simpleSwap.swapExactTokensForTokens(
            0,
            0,
            [myTokenA.target, myTokenB.target],
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          simpleSwap,
          "SimpleSwap__ZeroInputAmount"
        );
      });

      it("should revert if the pool has insufficient liquidity", async function () {
        // Given: A brand new, empty SimpleSwap contract
        const freshSimpleSwap = await SimpleSwap.deploy(owner.address);

        // When: A user tries to swap on it
        // Then: The transaction must revert
        await expect(
          freshSimpleSwap.swapExactTokensForTokens(
            AMOUNT_TO_SWAP,
            0,
            [myTokenA.target, myTokenB.target],
            owner.address,
            (await time.latest()) + 100
          )
        ).to.be.revertedWithCustomError(
          freshSimpleSwap,
          "SimpleSwap__InsufficientLiquidity"
        );
      });
    });
  });

  describe("View Functions", function () {
    const viewLiquidityA = ethers.parseEther("1000");
    const viewLiquidityB = ethers.parseEther("2000"); // 1:2 ratio

    beforeEach(async function () {
      // This hook creates a 1:2 pool before each test in this suite.
      await myTokenA.connect(owner).approve(simpleSwap.target, viewLiquidityA);
      await myTokenB.connect(owner).approve(simpleSwap.target, viewLiquidityB);
      await simpleSwap
        .connect(owner)
        .addLiquidity(
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

    it("should revert with SimpleSwap__InsufficientLiquidity if reserveOut is zero", async () => {
      // Given: An input amount and reserves where the output reserve is zero
      const amountIn = ethers.parseUnits("1", 18);
      const reserveIn = ethers.parseUnits("100", 18);
      const reserveOut = 0n;

      // When: getAmountOut is called
      // Then: It should revert due to insufficient liquidity
      await expect(
        simpleSwap.getAmountOut(amountIn, reserveIn, reserveOut)
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__InsufficientLiquidity"
      );
    });

    it("should revert from getAmountOut if reserves are zero", async function () {
      // Given: A brand new, empty contract
      const freshSimpleSwap = await SimpleSwap.deploy(owner.address);
      const amountIn = ethers.parseEther("1");

      // When: getAmountOut is called with no reserves
      // Then: It should revert
      await expect(
        freshSimpleSwap.getAmountOut(amountIn, 0, 0)
      ).to.be.revertedWithCustomError(
        freshSimpleSwap,
        "SimpleSwap__InsufficientLiquidity"
      );
    });

    it("should revert from getAmountOut if input amount is zero", async function () {
      // Given: An existing pool with reserves
      const reserves = await simpleSwap.getReserves(
        myTokenA.target,
        myTokenB.target
      );

      // When: getAmountOut is called with an input of 0
      // Then: It should revert
      await expect(
        simpleSwap.getAmountOut(0, reserves[0], reserves[1])
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__ZeroInputAmount"
      );
    });

    // NOTE: This test is redundant with the one above, but preserved to maintain coverage.
    it("should revert from getAmountOut if reserves are zero", async function () {
      // Given: A brand new, empty contract
      const freshSimpleSwap = await SimpleSwap.deploy(owner.address);
      const amountIn = ethers.parseEther("1");

      // When: getAmountOut is called with no reserves
      // Then: It should revert
      await expect(
        freshSimpleSwap.getAmountOut(amountIn, 0, 0)
      ).to.be.revertedWithCustomError(
        freshSimpleSwap,
        "SimpleSwap__InsufficientLiquidity"
      );
    });

    it("getPrice should revert if reserves are zero", async function () {
      // Given: A brand new, empty contract
      const freshSimpleSwap = await SimpleSwap.deploy(owner.address);

      // When: getPrice is called with no reserves
      // Then: It should revert
      await expect(
        freshSimpleSwap.getPrice(myTokenA.target, myTokenB.target)
      ).to.be.revertedWithCustomError(
        freshSimpleSwap,
        "SimpleSwap__InsufficientLiquidity"
      );
    });

    // NOTE: This test is redundant, but preserved to maintain coverage.
    it("getAmountOut should revert if reserves are zero", async function () {
      // Given: A brand new, empty contract
      const freshSimpleSwap = await SimpleSwap.deploy(owner.address);
      const amountIn = ethers.parseEther("1");

      // When: getAmountOut is called with no reserves
      // Then: It should revert
      await expect(
        freshSimpleSwap.getAmountOut(amountIn, 0, 0)
      ).to.be.revertedWithCustomError(
        freshSimpleSwap,
        "SimpleSwap__InsufficientLiquidity"
      );
    });

    // NOTE: This test is redundant, but preserved to maintain coverage.
    it("getAmountOut should revert if input amount is zero", async function () {
      // Given: An existing pool with reserves
      const reserves = await simpleSwap.getReserves(
        myTokenA.target,
        myTokenB.target
      );

      // When: getAmountOut is called with an input of 0
      // Then: It should revert
      await expect(
        simpleSwap.getAmountOut(0, reserves[0], reserves[1])
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__ZeroInputAmount"
      );
    });

    it("getPrice should return the correct price", async function () {
      // Given: A pool with a 1:2 ratio (1000 A : 2000 B)

      // When: We ask for the price of A in terms of B
      // Then: The price should be 2.0 (scaled by 1e18)
      const expectedPrice =
        (viewLiquidityB * ethers.parseEther("1")) / viewLiquidityA;
      const price = await simpleSwap.getPrice(myTokenA.target, myTokenB.target);
      expect(price).to.equal(expectedPrice);

      // And When: We ask for the price of B in terms of A
      // Then: The price should be 0.5 (scaled by 1e18)
      const expectedPriceReverse =
        (viewLiquidityA * ethers.parseEther("1")) / viewLiquidityB;
      const priceReverse = await simpleSwap.getPrice(
        myTokenB.target,
        myTokenA.target
      );
      expect(priceReverse).to.equal(expectedPriceReverse);
    });

    it("getAmountOut should calculate the output amount correctly", async function () {
      // Given: The current reserves and a valid input amount
      const reserves = await simpleSwap.getReserves(
        myTokenA.target,
        myTokenB.target
      );
      const amountInTest = ethers.parseEther("5");

      // When: We calculate the expected output using the standard formula
      const expectedAmountOut =
        (amountInTest * reserves[1]) / (reserves[0] + amountInTest);

      // Then: The contract's function should return the exact same value
      const calculatedAmountOut = await simpleSwap.getAmountOut(
        amountInTest,
        reserves[0],
        reserves[1]
      );
      expect(calculatedAmountOut).to.equal(expectedAmountOut);
    });
  });

  describe("Security and Emergency Functions", function () {
    // This hook runs before each test in this suite.
    // It creates a pool funded by `addr1` to test scenarios requiring existing liquidity.

    beforeEach(async function () {
      const liquidityAmount = ethers.parseEther("100");
      await myTokenA.connect(owner).transfer(addr1.address, liquidityAmount);
      await myTokenB.connect(owner).transfer(addr1.address, liquidityAmount);

      await myTokenA.connect(addr1).approve(simpleSwap.target, liquidityAmount);
      await myTokenB.connect(addr1).approve(simpleSwap.target, liquidityAmount);

      await simpleSwap
        .connect(addr1)
        .addLiquidity(
          myTokenA.target,
          myTokenB.target,
          liquidityAmount,
          liquidityAmount,
          0,
          0,
          addr1.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        );
    });

    it("should complete successfully when the internal call succeeds", async function () {
      // NOTE: This test is for the helper contract `MaliciousReceiver`.
      // Given: A simple response contract that is designed to always succeed when called.

      const SuccessResponse = await ethers.getContractFactory(
        "SuccessResponse"
      );
      const successResponse = await SuccessResponse.deploy();

      const MaliciousReceiver = await ethers.getContractFactory(
        "MaliciousReceiver"
      );
      const maliciousReceiver = await MaliciousReceiver.deploy();

      await expect(maliciousReceiver.executeWithdraw(successResponse.target)).to
        .not.be.reverted;
    });

    it("should revert if a non-owner tries to withdraw ETH", async function () {
      // When: A non-owner (addr1) calls the owner-only withdrawETH function.
      // Then: The transaction must revert with the correct Ownable error.
      await expect(simpleSwap.connect(addr1).withdrawETH())
        .to.be.revertedWithCustomError(simpleSwap, "OwnableUnauthorizedAccount")
        .withArgs(addr1.address);
    });

    it("should allow the owner to withdraw accidentally sent ETH", async function () {
      // Given: The contract has an ETH balance from an accidental transfer.
      const amountToSend = ethers.parseEther("1.0");
      await addr1.sendTransaction({
        to: simpleSwap.target,
        value: amountToSend,
      });

      expect(await ethers.provider.getBalance(simpleSwap.target)).to.equal(
        amountToSend
      );

      const ownerBalanceBefore = await ethers.provider.getBalance(
        owner.address
      );
      // When: The owner calls withdrawETH.
      const tx = await simpleSwap.connect(owner).withdrawETH();

      // Then: The contract's ETH balance should be zero and the owner's balance should increase accordingly.
      expect(await ethers.provider.getBalance(simpleSwap.target)).to.equal(0);

      // When: The owner calls withdrawETH.
      // Then: The transaction must revert with the specific error.
      await expect(tx).to.changeEtherBalance(owner, amountToSend);
    });

    it("should revert if owner tries to withdraw ETH when balance is zero", async function () {
      // Given: A surplus of Token A is accidentally sent to the contract.
      expect(await ethers.provider.getBalance(simpleSwap.target)).to.equal(0);

      await expect(
        simpleSwap.connect(owner).withdrawETH()
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__NoEthToWithdraw"
      );
    });
    it("should allow the owner to recover surplus ERC20 tokens", async function () {
      const surplusAmount = ethers.parseEther("10");

      await myTokenA.connect(owner).transfer(simpleSwap.target, surplusAmount);

      const reserves = await simpleSwap.getReserves(
        myTokenA.target,
        myTokenB.target
      );
      // Then: The contract's final token balance should equal its tracked reserve.
      const actualBalanceA = await myTokenA.balanceOf(simpleSwap.target);
      expect(actualBalanceA).to.equal(reserves[0] + surplusAmount);

      const ownerBalanceBefore = await myTokenA.balanceOf(owner.address);

      await simpleSwap
        .connect(owner)
        .recoverERC20(myTokenA.target, myTokenB.target, myTokenA.target);

      const actualBalanceA_after = await myTokenA.balanceOf(simpleSwap.target);
      expect(actualBalanceA_after).to.equal(reserves[0]);

      const ownerBalanceAfter = await myTokenA.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + surplusAmount);
    });

    it("should revert if a non-owner tries to call recoverERC20", async function () {
      // Given: The pool is set up by the beforeEach hook.
      // When: A non-owner (addr1) tries to recover tokens.
      // Then: The transaction must revert with the correct Ownable error.
      await expect(
        simpleSwap
          .connect(addr1)
          .recoverERC20(myTokenA.target, myTokenB.target, myTokenA.target)
      )
        .to.be.revertedWithCustomError(simpleSwap, "OwnableUnauthorizedAccount")
        .withArgs(addr1.address);
    });

    it("should revert if deadline has passed", async function () {
      // Given: A deadline.
      const deadline = (await time.latest()) + 100; // Get current block timestamp

      await time.increase(101); // Increase time by 101 seconds, past the deadline

      await expect(
        simpleSwap
          .connect(owner)
          .swapExactTokensForTokens(
            ethers.parseEther("1"),
            0,
            [myTokenA.target, myTokenB.target],
            owner.address,
            deadline
          )
      ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__Expired");
    });

    it("should revert addLiquidity if tokens are not approved", async function () {
      // Given: A user (owner) has not approved the contract to spend their tokens.
      await expect(
        simpleSwap
          .connect(owner)
          .addLiquidity(
            myTokenA.target,
            myTokenB.target,
            initialLiquidity,
            initialLiquidity,
            0,
            0,
            owner.address,
            (await ethers.provider.getBlock("latest")).timestamp + 100
          )
      ).to.be.revertedWithCustomError(myTokenA, "ERC20InsufficientAllowance");
    });

    it("should allow the owner to recover surplus Token B", async function () {
      const surplusAmount = ethers.parseEther("10");

      await myTokenB.connect(owner).transfer(simpleSwap.target, surplusAmount);

      await simpleSwap
        .connect(owner)
        .recoverERC20(myTokenA.target, myTokenB.target, myTokenB.target);

      const reserves = await simpleSwap.getReserves(
        myTokenA.target,
        myTokenB.target
      );
      const finalBalanceB = await myTokenB.balanceOf(simpleSwap.target);
      expect(finalBalanceB).to.equal(reserves[1]);
    });

    it("should revert if trying to recover a token not in the pair", async function () {
      const UnrelatedToken = await ethers.getContractFactory("MyTokenA");
      const unrelatedToken = await UnrelatedToken.deploy(
        owner.address,
        owner.address
      );

      await expect(
        simpleSwap
          .connect(owner)
          .recoverERC20(myTokenA.target, myTokenB.target, unrelatedToken.target)
      ).to.be.revertedWith("SimpleSwap__TokenNotInPair");
    });

    it("should revert if the owner (a contract) fails to receive ETH", async function () {
      // Given: A third, unrelated token contract.
      const MaliciousReceiver = await ethers.getContractFactory(
        "MaliciousReceiver"
      );
      const maliciousReceiver = await MaliciousReceiver.deploy();

      const simpleSwap = await SimpleSwap.deploy(owner.address);

      await simpleSwap
        .connect(owner)
        .transferOwnership(maliciousReceiver.target);
      expect(await simpleSwap.owner()).to.equal(maliciousReceiver.target);

      const amountToSend = ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: simpleSwap.target,
        value: amountToSend,
      });

      await expect(
        maliciousReceiver.executeWithdraw(simpleSwap.target)
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__EthTransferFailed"
      );
    });

    it("VULNERABILITY: owner should NOT be able to drain pool funds via recoverERC20", async function () {
      // Given: The pool is set up by the `beforeEach` hook, with no surplus
      // When: The owner tries to recover tokens that are part of the pool's official liquidity.
      // Then: The transaction must revert, preventing the rug pull.
      await expect(
        simpleSwap
          .connect(owner)
          .recoverERC20(myTokenA.target, myTokenB.target, myTokenA.target)
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__NoTokensToRecover"
      );
    });
  });
});
