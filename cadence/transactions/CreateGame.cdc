import MinorityRuleGame from "MinorityRuleGame"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(questionText: String, entryFee: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    let payment: @{FungibleToken.Vault}
    let creator: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.creator = signer.address
        
        // Borrow the game manager from the contract account (address resolved via flow.json aliases)
        self.gameManager = getAccount(0x0cba6f974b0aa625)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Create the game
        let gameId = self.gameManager.createGame(
            questionText: questionText,
            entryFee: entryFee,
            creator: self.creator
        )
        
        // Get reference to the created game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Could not borrow created game")
        
        // Get creator's Flow token vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault")
        
        // Withdraw entry fee only (no scheduling fund needed - Forte handles scheduling)
        self.payment <- flowVault.withdraw(amount: entryFee)
    }
    
    execute {
        // Creator joins as first player
        self.game.joinGame(
            player: self.creator, 
            payment: <- self.payment
        )
        
        log("Game created with ID: ".concat(self.game.gameId.toString()))
        log("Creator ".concat(self.creator.toString()).concat(" joined game"))
    }
}