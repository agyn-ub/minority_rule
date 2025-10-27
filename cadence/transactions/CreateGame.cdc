import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(questionText: String, entryFee: UFix64, roundDuration: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    let payment: @{FungibleToken.Vault}
    let schedulingFund: @{FungibleToken.Vault}
    let creator: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.creator = signer.address
        
        // Get the contract address (you'll need to pass this as a parameter in production)
        // For now, using a placeholder - replace 0xCONTRACT with actual deployed address
        let contractAddress = Address(0x73c003cd6de60fd4) // MinorityRuleGame deployed address
        
        // Borrow the game manager from public capability
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Create the game
        let gameId = self.gameManager.createGame(
            questionText: questionText,
            entryFee: entryFee,
            creator: self.creator,
            roundDuration: roundDuration
        )
        
        // Get reference to the created game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Could not borrow created game")
        
        // Get creator's Flow token vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault")
        
        // Withdraw entry fee + scheduling fund (1 FLOW)
        self.payment <- flowVault.withdraw(amount: entryFee)
        self.schedulingFund <- flowVault.withdraw(amount: 1.0)
    }
    
    execute {
        // Creator joins as first player and provides scheduling fund
        self.game.joinGame(
            player: self.creator, 
            payment: <- self.payment,
            schedulingFund: <- self.schedulingFund
        )
        
        log("Game created with ID: ".concat(self.game.gameId.toString()))
        log("Creator ".concat(self.creator.toString()).concat(" joined and funded scheduling"))
    }
}