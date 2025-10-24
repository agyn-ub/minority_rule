import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(gameId: UInt64) {
    
    let gameManager: &MinorityRuleGame.GameManager
    let payment: @{FungibleToken.Vault}
    let player: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
        
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Get player's Flow token vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault")
        
        // Withdraw entry fee
        self.payment <- flowVault.withdraw(amount: game.entryFee)
        self.player = signer.address
        
        // Store the game ticket in player's account
        let ticketPath = StoragePath(identifier: "MinorityRuleGameTicket_".concat(gameId.toString()))!
        signer.storage.save(<- gameTicket, to: ticketPath)
        
        // Create public capability for game ticket
        let publicPath = PublicPath(identifier: "MinorityRuleGameTicket_".concat(gameId.toString()))!
        signer.capabilities.publish(
            signer.capabilities.storage.issue<&MinorityRuleGame.GameTicket>(ticketPath),
            at: publicPath
        )
        
        log("Player ".concat(self.player.toString()).concat(" joined game ").concat(gameId.toString()))
    }
    
    execute {
        // Everything done in prepare
    }
}