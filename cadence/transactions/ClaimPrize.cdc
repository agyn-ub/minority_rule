import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(gameId: UInt64) {
    
    let gameManager: &MinorityRuleGame.GameManager
    let winnerVault: &{FungibleToken.Receiver}
    let winner: Address
    
    prepare(signer: auth(Storage) &Account) {
        self.winner = signer.address
        
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
        
        // Get winner's Flow token vault
        self.winnerVault = signer.storage.borrow<&{FungibleToken.Receiver}>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault")
    }
    
    execute {
        // Get the game and claim prize
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Claim prize - contract verifies winner from stored winners array
        let prize <- game.claimPrize(winner: self.winner)
        let prizeAmount = prize.balance
        
        self.winnerVault.deposit(from: <- prize)
        
        log("Winner ".concat(self.winner.toString())
            .concat(" claimed ")
            .concat(prizeAmount.toString())
            .concat(" FLOW from game ")
            .concat(gameId.toString()))
    }
}