import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(gameId: UInt64) {
    
    let gameManager: &MinorityRuleGame.GameManager
    let votingToken: &MinorityRuleGame.VotingToken
    let winnerVault: &{FungibleToken.Receiver}
    let winner: Address
    
    prepare(signer: auth(Storage) &Account) {
        self.winner = signer.address
        
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
        
        // Get player's voting token
        self.votingToken = signer.storage.borrow<&MinorityRuleGame.VotingToken>(
            from: MinorityRuleGame.VotingTokenStoragePath
        ) ?? panic("No voting token found - must have played in the game")
        
        // Get winner's Flow token vault
        self.winnerVault = signer.storage.borrow<&{FungibleToken.Receiver}>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault")
    }
    
    execute {
        // Get the game and claim prize
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        let prize <- game.claimPrize(winner: self.winner, token: self.votingToken)
        let prizeAmount = prize.balance
        
        self.winnerVault.deposit(from: <- prize)
        
        log("Winner ".concat(self.winner.toString())
            .concat(" claimed ")
            .concat(prizeAmount.toString())
            .concat(" FLOW from game ")
            .concat(gameId.toString()))
    }
}