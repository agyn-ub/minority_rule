import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(gameId: UInt64) {
    
    let gameManager: &MinorityRuleGame.GameManager
    let game: &MinorityRuleGame.Game
    let payment: @{FungibleToken.Vault}
    let player: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.player = signer.address
        
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Get player's Flow token vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault")
        
        // Withdraw entry fee
        self.payment <- flowVault.withdraw(amount: self.game.entryFee)
    }
    
    execute {
        // Join the game (no ticket needed anymore - everything stored in contract)
        self.game.joinGame(player: self.player, payment: <- self.payment)
        
        log("Player ".concat(self.player.toString()).concat(" joined game ").concat(gameId.toString()))
    }
}