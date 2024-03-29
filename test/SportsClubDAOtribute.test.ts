import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import chai from "chai";
import { expect } from "chai";

chai.should()

// Defaults to e18 using amount * 10^18
function getBigNumber(amount: any, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals))
}

async function advanceTime(time: any) {
  await ethers.provider.send("evm_increaseTime", [time])
}

describe("Tribute", function () {
    let SportsClub: any // SportsClubDAO contract
    let sportsclub: any // SportsClubDAO contract instance
    let Tribute: any // Tribute contract
    let tribute: any // Tribute contract instance
    let proposer: any // signerA
    let alice: any // signerB
    let bob: any // signerC
  
    beforeEach(async () => {
      ;[proposer, alice, bob] = await ethers.getSigners()
  
      SportsClub = await ethers.getContractFactory("SportsClubDAO")
      sportsclub = await SportsClub.deploy()
      await sportsclub.deployed()
      // console.log(sportsclub.address)
      // console.log("alice eth balance", await alice.getBalance())
      // console.log("bob eth balance", await bob.getBalance())
      Tribute = await ethers.getContractFactory("SportsClubDAOtribute")
      tribute = await Tribute.deploy()
      await tribute.deployed()
    })

    it("Should process tribute proposal directly", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            getBigNumber(0)
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, true)
        await advanceTime(35)
        await tribute.releaseTributeProposalAndProcess(sportsclub.address, 1)
        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(0)
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            getBigNumber(50)
        )
        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(1010)
        )
    })
  
    it("Should process ETH tribute proposal", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            getBigNumber(0)
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, true)
        await advanceTime(35)
        await sportsclub.processProposal(1)
        await tribute.releaseTributeProposal(sportsclub.address, 1)
        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(0)
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            getBigNumber(50)
        )
        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(1010)
        )
    })

    it("Should process ERC20 tribute proposal", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubERC20")
        let purchaseToken = await PurchaseToken.deploy()
        await purchaseToken.deployed()
        await purchaseToken.init(
            "SPORTSCLUB",
            "SPORTSCLUB",
            "DOCS",
            [proposer.address],
            [getBigNumber(1000)],
            false,
            proposer.address
        )

        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, getBigNumber(50))

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            purchaseToken.address,
            getBigNumber(50)
        )
        
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(950)
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(50)
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            getBigNumber(0)
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, true)
        await advanceTime(35)
        await sportsclub.processProposal(1)
        await tribute.releaseTributeProposal(sportsclub.address, 1)
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(950)
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(0)
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            getBigNumber(50)
        )
        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(1010)
        )
    })

    it("Should process NFT tribute proposal", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubNFT")
        let purchaseToken = await PurchaseToken.deploy(
            "NFT",
            "NFT"
        )
        await purchaseToken.deployed()
        await purchaseToken.mint(proposer.address, 1, "DOCS")

        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, 1)

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            true,
            purchaseToken.address,
            1
        )

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            tribute.address
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            0
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, true)
        await advanceTime(35)
        await sportsclub.processProposal(1)
        await tribute.releaseTributeProposal(sportsclub.address, 1)
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            sportsclub.address
        )
        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(1010)
        )
    })

    it("Should allow ETH tribute proposal cancellation", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )

        await tribute.cancelTributeProposal(sportsclub.address, 1)

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            0
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            0
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )
    })

    it("Should allow ERC20 tribute proposal cancellation", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubERC20")
        let purchaseToken = await PurchaseToken.deploy()
        await purchaseToken.deployed()
        await purchaseToken.init(
            "SPORTSCLUB",
            "SPORTSCLUB",
            "DOCS",
            [proposer.address],
            [getBigNumber(1000)],
            false,
            proposer.address
        )
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, getBigNumber(50))

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            purchaseToken.address,
            getBigNumber(50)
        )
        
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(950)
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(50)
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            getBigNumber(0)
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )

        await tribute.cancelTributeProposal(sportsclub.address, 1)

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(1000)
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(0)
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            getBigNumber(0)
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )
    })

    it("Should allow NFT tribute proposal cancellation", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubNFT")
        let purchaseToken = await PurchaseToken.deploy(
            "NFT",
            "NFT"
        )
        await purchaseToken.deployed()
        await purchaseToken.mint(proposer.address, 1, "DOCS")

        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, 1)

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            true,
            purchaseToken.address,
            1
        )

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            tribute.address
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            0
        )

        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )

        await tribute.cancelTributeProposal(sportsclub.address, 1)

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            proposer.address
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            0
        )
   
        expect(await sportsclub.balanceOf(proposer.address)).to.equal(
            getBigNumber(10)
        )
    })

    it("Should prevent cancellation by non-proposer of tribute proposal", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )
        
        expect(await tribute.connect(alice).cancelTributeProposal(sportsclub.address, 1).should.be.reverted)
    })

    it("Should prevent cancellation of sponsored ETH tribute proposal", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )

        await sportsclub.sponsorProposal(1)
        
        expect(await tribute.cancelTributeProposal(sportsclub.address, 1).should.be.reverted)
    })

    it("Should prevent cancellation of sponsored ERC20 tribute proposal", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubERC20")
        let purchaseToken = await PurchaseToken.deploy()
        await purchaseToken.deployed()
        await purchaseToken.init(
            "SPORTSCLUB",
            "SPORTSCLUB",
            "DOCS",
            [proposer.address],
            [getBigNumber(1000)],
            false,
            proposer.address
        )
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, getBigNumber(50))

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            purchaseToken.address,
            getBigNumber(50)
        )
        
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(950)
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(50)
        )

        await sportsclub.sponsorProposal(1)
        
        expect(await tribute.cancelTributeProposal(sportsclub.address, 1).should.be.reverted)

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(950)
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(50)
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            getBigNumber(0)
        )
    })

    it("Should prevent cancellation of sponsored NFT tribute proposal", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubNFT")
        let purchaseToken = await PurchaseToken.deploy(
            "NFT",
            "NFT"
        )
        await purchaseToken.deployed()
        await purchaseToken.mint(proposer.address, 1, "DOCS")

        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, 1)

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            true,
            purchaseToken.address,
            1
        )

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            tribute.address
        )

        await sportsclub.sponsorProposal(1)
        
        expect(await tribute.cancelTributeProposal(sportsclub.address, 1).should.be.reverted)

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            tribute.address
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            0
        )
    })

    it("Should return ETH tribute to proposer if proposal unsuccessful", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, false)
        await advanceTime(35)
        await sportsclub.processProposal(1)
        await tribute.releaseTributeProposal(sportsclub.address, 1)
        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(0)
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            getBigNumber(0)
        )
    })

    it("Should return ERC20 tribute to proposer if proposal unsuccessful", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubERC20")
        let purchaseToken = await PurchaseToken.deploy()
        await purchaseToken.deployed()
        await purchaseToken.init(
            "SPORTSCLUB",
            "SPORTSCLUB",
            "DOCS",
            [proposer.address],
            [getBigNumber(1000)],
            false,
            proposer.address
        )
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, getBigNumber(50))

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            purchaseToken.address,
            getBigNumber(50)
        )

        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(950)
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(50)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, false)
        await advanceTime(35)
        await sportsclub.processProposal(1)
        await tribute.releaseTributeProposal(sportsclub.address, 1)
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            getBigNumber(0)
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            getBigNumber(0)
        )
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            getBigNumber(1000)
        )
    })

    it("Should return NFT tribute to proposer if proposal unsuccessful", async function () {
        // Instantiate purchaseToken
        let PurchaseToken = await ethers.getContractFactory("SportsClubNFT")
        let purchaseToken = await PurchaseToken.deploy(
            "NFT",
            "NFT"
        )
        await purchaseToken.deployed()
        await purchaseToken.mint(proposer.address, 1, "DOCS")

        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        
        await purchaseToken.approve(tribute.address, 1)

        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            true,
            purchaseToken.address,
            1
        )
        
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            tribute.address
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, false)
        await advanceTime(35)
        await sportsclub.processProposal(1)
        await tribute.releaseTributeProposal(sportsclub.address, 1)
        expect(await purchaseToken.balanceOf(tribute.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(sportsclub.address)).to.equal(
            0
        )
        expect(await purchaseToken.balanceOf(proposer.address)).to.equal(
            1
        )
        expect(await purchaseToken.ownerOf(1)).to.equal(
            proposer.address
        )
    })

    it("Should prevent tribute return to proposer if proposal not processed", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, true)
        await advanceTime(35)
        expect(await tribute.releaseTributeProposal(sportsclub.address, 1).should.be.reverted)
        expect(await tribute.releaseTributeProposal(sportsclub.address, 2).should.be.reverted)
        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            getBigNumber(0)
        )
    })

    it("Should prevent release call if already completed", async function () {
        // Instantiate SportsClubDAO
        await sportsclub.init(
          "SPORTSCLUB",
          "SPORTSCLUB",
          "DOCS",
          false,
          [],
          [],
          [proposer.address],
          [getBigNumber(10)],
          [30, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          proposer.address
        )
        // Instantiate Tribute
        await tribute.submitTributeProposal(
            sportsclub.address,
            0,
            "TRIBUTE",
            [proposer.address],
            [getBigNumber(1000)],
            [0x00],
            false,
            "0x0000000000000000000000000000000000000000",
            getBigNumber(50),
            { value: getBigNumber(50), }
        )

        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(50)
        )

        await sportsclub.sponsorProposal(1)
        await sportsclub.vote(1, false)
        await advanceTime(35)
        await sportsclub.processProposal(1)
        await tribute.releaseTributeProposal(sportsclub.address, 1)
        expect(await ethers.provider.getBalance(tribute.address)).to.equal(
            getBigNumber(0)
        )
        expect(await ethers.provider.getBalance(sportsclub.address)).to.equal(
            getBigNumber(0)
        )
        expect(await tribute.releaseTributeProposal(sportsclub.address, 1).should.be.reverted)
    })
})
