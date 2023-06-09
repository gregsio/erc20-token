const { ethers } = require('hardhat'); 
const { expect } = require('chai');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Token', () => {
    let token, accounts, deployer, receiver

    beforeEach( async () => {
        const Token = await ethers.getContractFactory('Token')
        token = await Token.deploy('SYZYGY','CZG', 1000000)

        accounts = await ethers.getSigners()
        deployer = accounts[0]
        receiver = accounts[1]
        exchange = accounts[2]
    })

    describe( 'Deployment', () => {
        const name = 'SYZYGY'
        const symbol = 'CZG'
        const decimals = 18
        const totalSupply = tokens(1000000)

        it('has correct name', async () => {
            expect(await token.name()).to.equal(name)
        })
        it('has correct symbol', async () => {
            expect(await token.symbol()).to.equal(symbol)
        })
        it('has correct decimals', async () => {
            expect(await token.decimals()).to.equal(decimals)
        })
        it('has correct total supply', async () => {
            expect(await token.totalSupply()).to.equal(totalSupply)
        })
        it('assigns all tokens to the contract\'s deployer', async () => {
            expect(await token.balanceOf(deployer.address)).to.equal(totalSupply)
        })
    })

    describe( 'Sendings tokens', () => {
        let amount, transaction, result

        describe('Sucess', () => {

            beforeEach(async () => {
                amount = tokens(100)
                transaction = await token.connect(deployer).transfer(receiver.address, amount)
                result =  await transaction.wait()
            })

            it('transfers token balances', async () => {
                expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900))
                expect(await token.balanceOf(receiver.address)).to.equal(amount)
            })

            it('emits a Transfer event', async () => {
                const event = result.events[0]
                expect(event.event).to.equal('Transfer')

                const args = event.args
                expect(args.from).to.equal(deployer.address)
                expect(args.to).to.equal(receiver.address)
                expect(args.value).to.equal(amount)
            })

        })
        describe('Failure', () => {
            it('fails if account balance is insufficient', async () => {
                let invalidAmount = tokens(100000000)
                await expect(token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted
            })

            it('fails to send tokens to invalid address', async () => {
                const amount = tokens(100)
                await expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
            })
        })
    })
    describe('Approving tokens',() => {
        let amount, transaction, result
        
        describe('Sucess', () => {
            beforeEach(async () => {
                amount = tokens(100)
                transaction = await token.connect(deployer).approve(exchange.address, amount)
                result =  await transaction.wait()
            })
            
            it('grants an allowance for delegating token spending', async () => {
                expect(await token.allowance(deployer.address, exchange.address)).to.equal(amount)
            })

            it('emits an Approval event', async () => {
                const event = result.events[0]
                expect(event.event).to.equal('Approval')

                const args = event.args
                expect(args.owner).to.equal(deployer.address)
                expect(args.spender).to.equal(exchange.address)
                expect(args.value).to.equal(amount)
            })

        })

        describe('Failure', () => {
            it ('fails to delegate spending to an invalid address', async () =>  {
                await expect( token.connect(deployer).approve('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
            })
        })
    })
    describe('Transfers delegating tokens', () => {
        let amount, transaction, result
        beforeEach(async () => {
            amount = tokens(100)
            transaction = await token.connect(deployer).approve(exchange.address, amount)
            result =  await transaction.wait()
        })
        describe('Success', () => {
            beforeEach(async () => {
                amount = tokens(100)
                transaction = await token.connect(exchange).transferFrom(deployer.address, receiver.address, amount)
                result =  await transaction.wait()
            })
            it ('Transfers delegated tokens', async () => {
                expect(await token.connect(deployer).balanceOf(deployer.address)).to.equal(tokens(999900))
            })
            it ('Updates allowance', async () => {
                expect(await token.allowance(deployer.address,exchange.address)).to.equal(0)
            })

            it('emits a Transfer event', async () => {
                const event = result.events[0]
                expect(event.event).to.equal('Transfer')

                const args = event.args
                expect(args.from).to.equal(deployer.address)
                expect(args.to).to.equal(receiver.address)
                expect(args.value).to.equal(amount)
            })
        })
        describe('Failures', () => {
            const invalidDelegatedAmount = tokens(101)     
            it ('fails to transfer more than the allowance', async () => {
                await expect(token.connect(exchange).transferFrom(deployer.address, receiver.address, invalidDelegatedAmount)).to.be.reverted
            })
            it ('fails to transfer non delegated tokens', async () => {
                await expect(token.connect(exchange).transferFrom(receiver.address, deployer.address, invalidDelegatedAmount)).to.be.reverted
            })
        })

    })
})
