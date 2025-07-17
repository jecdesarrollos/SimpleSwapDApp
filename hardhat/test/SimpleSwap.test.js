// hardhat/test/SimpleSwap.test.js

// Import Hardhat testing tools
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

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
  const initialLiquidity = ethers.parseEther("10"); // 10 tokens for liquidity

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    MyTokenAContract = await ethers.getContractFactory("MyTokenA");
    myTokenA = await MyTokenAContract.deploy(owner.address, owner.address);
    MyTokenBContract = await ethers.getContractFactory("MyTokenB");
    myTokenB = await MyTokenBContract.deploy(owner.address, owner.address);

    SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    simpleSwap = await SimpleSwap.deploy(owner.address);
  });

  describe("addLiquidity", function () {
    it("should revert with SimpleSwap__ZeroInitialLiquidity if liquidity is too small", async function () {
      // MyTokenA/B tokens have 18 decimals. MINIMUM_LIQUIDITY is 1e3 (1000 units).
      // If we send 1 base unit of each token: (1 * 1).sqrt() = 1. Since 1 <= 1000, it should revert.
      await myTokenA.connect(owner).approve(simpleSwap.target, 1);
      await myTokenB.connect(owner).approve(simpleSwap.target, 1);
      await expect(
        simpleSwap.connect(owner).addLiquidity(
          myTokenA.target,
          myTokenB.target,
          1,
          1,
          0,
          0, 
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__ZeroInitialLiquidity"
      );
    });

it("should add liquidity correctly when Token B is the limiting factor", async function () {

    const initialA = ethers.parseEther("100");
    const initialB = ethers.parseEther("200");
    await myTokenA.approve(simpleSwap.target, ethers.MaxUint256);
    await myTokenB.approve(simpleSwap.target, ethers.MaxUint256);
    await simpleSwap.addLiquidity(myTokenA.target, myTokenB.target, initialA, initialB, 0, 0, owner.address, (await time.latest()) + 100);

    const amountADesired = ethers.parseEther("10");
    const amountBDesired = ethers.parseEther("10"); // <-- Esta es la cantidad limitante.


    const expectedAmountA = ethers.parseEther("5"); 
    const expectedAmountB = amountBDesired;


    await expect(
        simpleSwap.addLiquidity(myTokenA.target, myTokenB.target, amountADesired, amountBDesired, 0, 0, owner.address, (await time.latest()) + 100)
    ).to.emit(simpleSwap, "LiquidityAdded").withArgs(
        owner.address,
        myTokenA.target < myTokenB.target ? myTokenA.target : myTokenB.target,
        myTokenA.target < myTokenB.target ? myTokenB.target : myTokenA.target,
        expectedAmountA, 
        expectedAmountB, 
        (liquidity) => liquidity > 0
    );
});

    it("should add liquidity correctly when Token B is the limiting factor", async function () {

    const initialA = ethers.parseEther("200");
    const initialB = ethers.parseEther("100");
    await myTokenA.approve(simpleSwap.target, ethers.MaxUint256);
    await myTokenB.approve(simpleSwap.target, ethers.MaxUint256); // <-- LÍNEA CORREGIDA
    await simpleSwap.addLiquidity(myTokenA.target, myTokenB.target, initialA, initialB, 0, 0, owner.address, (await time.latest()) + 100);

    const amountADesired = ethers.parseEther("20");
    const amountBDesired = ethers.parseEther("5"); 


    const expectedAmountA = ethers.parseEther("10"); 
    const expectedAmountB = amountBDesired;


    await expect(
        simpleSwap.addLiquidity(myTokenA.target, myTokenB.target, amountADesired, amountBDesired, 0, 0, owner.address, (await time.latest()) + 100)
    ).to.emit(simpleSwap, "LiquidityAdded").withArgs(
        owner.address,
        myTokenA.target < myTokenB.target ? myTokenA.target : myTokenB.target,
        myTokenA.target < myTokenB.target ? myTokenB.target : myTokenA.target,
        expectedAmountA,
        expectedAmountB,
        (liquidity) => liquidity > 0 
    );
});
    
    it("should revert with SimpleSwap__InsufficientAmountA (in existing pool)", async function () {
      // Setup initial liquidity (100:100)
      await myTokenA
        .connect(owner)
        .approve(simpleSwap.target, ethers.parseEther("100"));
      await myTokenB
        .connect(owner)
        .approve(simpleSwap.target, ethers.parseEther("100"));
      await simpleSwap
        .connect(owner)
        .addLiquidity(
          myTokenA.target,
          myTokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        );
      await expect(
        simpleSwap.connect(owner).addLiquidity(
          myTokenA.target,
          myTokenB.target,
          ethers.parseEther("1"), // amountADesired
          ethers.parseEther("0.1"), // amountBDesired
          ethers.parseEther("0.5"), // amountAMin (much larger than the 0.1 we would get)
          BigInt(0), // amountBMin
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__InsufficientAmountA"
      );
    });

    it("should revert with SimpleSwap__InsufficientAmountB (in existing pool)", async function () {
      // Setup initial liquidity (e.g., 100 MTA and 100 MTB) for a 1:1 ratio
      await myTokenA
        .connect(owner)
        .approve(simpleSwap.target, ethers.parseEther("100"));
      await myTokenB
        .connect(owner)
        .approve(simpleSwap.target, ethers.parseEther("100"));
      await simpleSwap
        .connect(owner)
        .addLiquidity(
          myTokenA.target,
          myTokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        );

      // Scenario: We want to add a tiny amount of TokenA (0.0001 MTA)
      // This will require an equally tiny amount of TokenB (0.0001 MTB) due to 1:1 ratio.
      // But we set amountBMin much higher (0.1 MTB) to trigger InsufficientAmountB.
      // amountAMin is kept at 0 to avoid triggering InsufficientAmountA by accident.
      const tinyAmountADesired = ethers.parseEther("0.0001"); // Very small
      const highAmountBMin = ethers.parseEther("0.1"); // Much larger than 0.0001

      // Approve a small amount to allow the transaction to be attempted
      await myTokenA
        .connect(owner)
        .approve(simpleSwap.target, ethers.parseEther("1"));
      await myTokenB
        .connect(owner)
        .approve(simpleSwap.target, ethers.parseEther("1"));

      await expect(
        simpleSwap.connect(owner).addLiquidity(
          myTokenA.target,
          myTokenB.target,
          tinyAmountADesired, // amountADesired: This will drive amountBOptimal down
          ethers.parseEther("1"), // amountBDesired: Can be anything, as ADesired is limiting
          BigInt(0), // amountAMin: Keep at 0 to avoid InsufficientAmountA
          highAmountBMin, // amountBMin: Should be greater than amountBOptimal
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__InsufficientAmountB"
      );
    });

    it("should add initial liquidity correctly and emit a LiquidityAdded event", async function () {

      await myTokenA
        .connect(owner)
        .approve(simpleSwap.target, initialLiquidity);
      await myTokenB
        .connect(owner)
        .approve(simpleSwap.target, initialLiquidity);


      const minimumLiquidity = await simpleSwap.MINIMUM_LIQUIDITY();
      const expectedLiquidity = initialLiquidity - minimumLiquidity;

      await expect(
        simpleSwap
          .connect(owner)
          .addLiquidity(
            myTokenA.target,
            myTokenB.target,
            initialLiquidity,
            initialLiquidity,
            initialLiquidity,
            initialLiquidity,
            owner.address,
            (await ethers.provider.getBlock("latest")).timestamp + 100
          )
      )
        .to.emit(simpleSwap, "LiquidityAdded")
        .withArgs(

          owner.address, // 1. sender
          myTokenA.target, // 2. tokenA
          myTokenB.target, // 3. tokenB
          initialLiquidity, // 4. amountA
          initialLiquidity, // 5. amountB
          expectedLiquidity // 6. liquidity 
        );
    });

    it("should revert if tokens are identical", async function () {
      await expect(
        simpleSwap.connect(owner).addLiquidity(
          myTokenA.target, // tokenA
          myTokenA.target, // tokenB (identical)
          initialLiquidity,
          initialLiquidity,
          initialLiquidity,
          initialLiquidity,
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__IdenticalTokens"
      );
    });
  });

  describe("removeLiquidity", function () {
    beforeEach(async function () {

      await myTokenA
        .connect(owner)
        .approve(simpleSwap.target, initialLiquidity);
      await myTokenB
        .connect(owner)
        .approve(simpleSwap.target, initialLiquidity);
      await simpleSwap
        .connect(owner)
        .addLiquidity(
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

 

it("should remove liquidity correctly, update balances, and emit a LiquidityRemoved event", async function () {
    // 1. ESTADO INICIAL
    const tokenABalance_before = await myTokenA.balanceOf(owner.address);
    const tokenBBalance_before = await myTokenB.balanceOf(owner.address);

const lpBalance = await simpleSwap.balanceOf(owner.address);
const reserves = await simpleSwap.getReserves(myTokenA.target, myTokenB.target);
const totalSupply = await simpleSwap.totalSupply();

const expectedAmountA = (lpBalance * reserves[0]) / totalSupply;
const expectedAmountB = (lpBalance * reserves[1]) / totalSupply;

    await expect(
        simpleSwap.connect(owner).removeLiquidity(
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

    // 4. VERIFICACIÓN DEL ESTADO FINAL
    const lpBalance_after = await simpleSwap.balanceOf(owner.address);    
    expect(lpBalance_after).to.equal(0);

    const tokenABalance_after = await myTokenA.balanceOf(owner.address);
    const tokenBBalance_after = await myTokenB.balanceOf(owner.address);

    expect(tokenABalance_after).to.be.gt(tokenABalance_before);
    expect(tokenBBalance_after).to.be.gt(tokenBBalance_before);
});

    it("should revert if attempting to remove liquidity with 0 LP tokens", async function () {
      await expect(
        simpleSwap.connect(owner).removeLiquidity(
          myTokenA.target,
          myTokenB.target,
          0, // 0 LP tokens
          0,
          0,
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 1
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__InvalidLiquidity"
      );
    });

    it("should revert if returning TokenA amount is less than amountAMin", async function () {
      // Ensure prior liquidity setup in the beforeEach
      const lpBalance = await simpleSwap.balanceOf(owner.address);
      await expect(
        simpleSwap.connect(owner).removeLiquidity(
          myTokenA.target,
          myTokenB.target,
          lpBalance / BigInt(2), // Remove half liquidity
          ethers.parseEther("1000"), // amountAMin too high for what we'll get
          0,
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__InsufficientAmountA"
      );
    });

    it("should revert if returning TokenB amount is less than amountBMin", async function () {
      // Setup initial liquidity is handled by the `beforeEach` in this `describe` block.
      const lpBalance = await simpleSwap.balanceOf(owner.address);

      // We attempt to remove a portion of liquidity, but demand a very high amountBMin.
      // For example, if you remove half liquidity, you'll get half of the reserves.
      // If initial reserves were 10, you'll get ~5. If amountBMin is 1000, it should fail.
      await expect(
        simpleSwap.connect(owner).removeLiquidity(
          myTokenA.target,
          myTokenB.target,
          lpBalance / BigInt(2), // Remove half liquidity
          0, // amountAMin: 0 to not cause that error
          ethers.parseEther("1000"), // amountBMin: Much more than what will be obtained from TokenB
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 100
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__InsufficientAmountB"
      );
    });
  });

  describe("swapExactTokensForTokens", function () {
    const swapLiquidityA = ethers.parseEther("100");
    const swapLiquidityB = ethers.parseEther("100");
    const swapAmountIn = ethers.parseEther("1"); 

    beforeEach(async function () {
      await myTokenA.connect(owner).approve(simpleSwap.target, swapLiquidityA);
      await myTokenB.connect(owner).approve(simpleSwap.target, swapLiquidityB);
      await simpleSwap
        .connect(owner)
        .addLiquidity(
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


it("should swap tokens correctly, update balances, and emit a Swapped event", async function () {
    const initialBalanceB = await myTokenB.balanceOf(owner.address);
    const reserves = await simpleSwap.getReserves(myTokenA.target, myTokenB.target);
    const amountIn = ethers.parseEther("1");

    const amountOut = await simpleSwap.getAmountOut(amountIn, reserves[0], reserves[1]);

    await myTokenA.connect(owner).approve(simpleSwap.target, amountIn);

    await expect(
        simpleSwap.connect(owner).swapExactTokensForTokens(
            amountIn,
            0, // amountOutMin a 0 para simplificar este test
            [myTokenA.target, myTokenB.target],
            owner.address,
            (await time.latest()) + 100
        )
    ).to.emit(simpleSwap, "Swapped").withArgs(
        owner.address,      // sender
        myTokenA.target,    // tokenIn
        myTokenB.target,    // tokenOut
        amountIn,           // amountIn
        amountOut,          // amountOut
        owner.address       // to
    );

    const finalBalanceB = await myTokenB.balanceOf(owner.address);
    expect(finalBalanceB).to.be.closeTo(initialBalanceB + amountOut, 1);
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
      const actualExpectedOut = await simpleSwap.getAmountOut(
        swapAmountIn,
        reservesA,
        reservesB
      );

      await myTokenA.connect(owner).approve(simpleSwap.target, swapAmountIn);

      await expect(
        simpleSwap.connect(owner).swapExactTokensForTokens(
          swapAmountIn,
          actualExpectedOut + BigInt(1), // Request 1 more than what will actually be obtained
          [myTokenA.target, myTokenB.target],
          owner.address,
          (await ethers.provider.getBlock("latest")).timestamp + 1
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__InsufficientOutputAmount"
      );
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
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__ZeroInputAmount"
      );
    });

    it("should revert if there is no liquidity in the pool", async function () {
      const freshSimpleSwap = await SimpleSwap.deploy(owner.address);
      await expect(
        freshSimpleSwap
          .connect(owner)
          .swapExactTokensForTokens(
            ethers.parseEther("1"),
            0,
            [myTokenA.target, myTokenB.target],
            owner.address,
            (await ethers.provider.getBlock("latest")).timestamp + 100
          )
      ).to.be.revertedWithCustomError(
        freshSimpleSwap,
        "SimpleSwap__InsufficientLiquidity"
      );
    });
  });

  describe("View Functions", function () {
    const viewLiquidityA = ethers.parseEther("1000");
    const viewLiquidityB = ethers.parseEther("2000"); // 1:2 ratio

    beforeEach(async function () {
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

    it("getPrice should return the correct price", async function () {
      const expectedPrice =
        (viewLiquidityB * ethers.parseEther("1")) / viewLiquidityA; // B/A * 1e18
      const price = await simpleSwap.getPrice(myTokenA.target, myTokenB.target);
      expect(price).to.equal(expectedPrice);

      const expectedPriceReverse =
        (viewLiquidityA * ethers.parseEther("1")) / viewLiquidityB; // A/B * 1e18
      const priceReverse = await simpleSwap.getPrice(
        myTokenB.target,
        myTokenA.target
      );
      expect(priceReverse).to.equal(expectedPriceReverse);
    });

    it("getAmountOut should calculate the output amount correctly", async function () {
      const reservesA = await myTokenA.balanceOf(simpleSwap.target);
      const reservesB = await myTokenB.balanceOf(simpleSwap.target);
      const amountInTest = ethers.parseEther("5"); // 5 input tokens

      const expectedAmountOut =
        (amountInTest * reservesB) / (reservesA + amountInTest);

      const calculatedAmountOut = await simpleSwap.getAmountOut(
        amountInTest,
        reservesA,
        reservesB
      );
      expect(calculatedAmountOut).to.equal(expectedAmountOut);
    });
  });


  describe("Security and Emergency Functions", function () {
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

    it("should revert if a non-owner tries to withdraw ETH", async function () {

    await expect(
        simpleSwap.connect(addr1).withdrawETH()
    ).to.be.revertedWithCustomError(simpleSwap, "OwnableUnauthorizedAccount")
     .withArgs(addr1.address);
});
   
it("should allow the owner to withdraw accidentally sent ETH", async function () {

    const amountToSend = ethers.parseEther("1.0");
    await addr1.sendTransaction({
        to: simpleSwap.target,
        value: amountToSend,
    });


    expect(await ethers.provider.getBalance(simpleSwap.target)).to.equal(amountToSend);

    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);


    const tx = await simpleSwap.connect(owner).withdrawETH();
    
    expect(await ethers.provider.getBalance(simpleSwap.target)).to.equal(0);

    await expect(tx).to.changeEtherBalance(owner, amountToSend);
});

it("should revert if owner tries to withdraw ETH when balance is zero", async function () {

    expect(await ethers.provider.getBalance(simpleSwap.target)).to.equal(0);


    await expect(
        simpleSwap.connect(owner).withdrawETH()
    ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__NoEthToWithdraw");
});
it("should allow the owner to recover surplus ERC20 tokens", async function () {
    const surplusAmount = ethers.parseEther("10");

    await myTokenA.connect(owner).transfer(simpleSwap.target, surplusAmount);

    const reserves = await simpleSwap.getReserves(myTokenA.target, myTokenB.target);
    const actualBalanceA = await myTokenA.balanceOf(simpleSwap.target);
    expect(actualBalanceA).to.equal(reserves[0] + surplusAmount);

    const ownerBalanceBefore = await myTokenA.balanceOf(owner.address);


    await simpleSwap.connect(owner).recoverERC20(
        myTokenA.target,
        myTokenB.target,
        myTokenA.target 
    );
    
    const actualBalanceA_after = await myTokenA.balanceOf(simpleSwap.target);
    expect(actualBalanceA_after).to.equal(reserves[0]);

    const ownerBalanceAfter = await myTokenA.balanceOf(owner.address);
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + surplusAmount);
});

    it("should revert if a non-owner tries to call recoverERC20", async function () {
      await expect(
        simpleSwap
          .connect(addr1)
          .recoverERC20(myTokenA.target, myTokenB.target, myTokenA.target)
      )
        .to.be.revertedWithCustomError(simpleSwap, "OwnableUnauthorizedAccount")
        .withArgs(addr1.address);
    });

    it("should revert if deadline has passed", async function () {
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
        // The error comes from the ERC20 contract, not SimpleSwap
      ).to.be.revertedWithCustomError(myTokenA, "ERC20InsufficientAllowance");
    });

it("should allow the owner to recover surplus Token B", async function () {

    const surplusAmount = ethers.parseEther("10");


    await myTokenB.connect(owner).transfer(simpleSwap.target, surplusAmount);


    await simpleSwap.connect(owner).recoverERC20(
        myTokenA.target,
        myTokenB.target,
        myTokenB.target
    );


    const reserves = await simpleSwap.getReserves(myTokenA.target, myTokenB.target);
    const finalBalanceB = await myTokenB.balanceOf(simpleSwap.target);
    expect(finalBalanceB).to.equal(reserves[1]);
});

it("should revert if trying to recover a token not in the pair", async function () {
    // Creamos un tercer token completamente diferente.
    const UnrelatedToken = await ethers.getContractFactory("MyTokenA");
    const unrelatedToken = await UnrelatedToken.deploy(owner.address, owner.address);

    await expect(
        simpleSwap.connect(owner).recoverERC20(
            myTokenA.target,
            myTokenB.target,
            unrelatedToken.target
        )
    ).to.be.revertedWith("SimpleSwap__TokenNotInPair");
});

it("should revert if the owner (a contract) fails to receive ETH", async function () {

    const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
    const maliciousReceiver = await MaliciousReceiver.deploy();

    const simpleSwap = await SimpleSwap.deploy(owner.address);


    await simpleSwap.connect(owner).transferOwnership(maliciousReceiver.target);
    expect(await simpleSwap.owner()).to.equal(maliciousReceiver.target);


    const amountToSend = ethers.parseEther("1.0");
    await owner.sendTransaction({
        to: simpleSwap.target,
        value: amountToSend,
    });

    await expect(
        maliciousReceiver.executeWithdraw(simpleSwap.target)
    ).to.be.revertedWithCustomError(simpleSwap, "SimpleSwap__EthTransferFailed");
});

    it("VULNERABILITY: owner should NOT be able to drain pool funds via recoverERC20", async function () {
      await expect(
        simpleSwap.connect(owner).recoverERC20(
          myTokenA.target,
          myTokenB.target,
          myTokenA.target 
        )
      ).to.be.revertedWithCustomError(
        simpleSwap,
        "SimpleSwap__NoTokensToRecover"
      );
    });
  });
});
