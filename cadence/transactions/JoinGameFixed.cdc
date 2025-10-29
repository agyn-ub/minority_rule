import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(gameId: UInt64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    let payment: @{FungibleToken.Vault}
    let player: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.player = signer.address
        
        // Use two-account address where the working contract is deployed
        let contractAddress = Address(0x1aee0aa4d20eac44)
        
        // Borrow the game manager from public capability
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get reference to the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Could not borrow game")
        
        // Get player's Flow token vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault")
        
        // Withdraw entry fee
        self.payment <- flowVault.withdraw(amount: self.game.entryFee)
    }
    
    execute {
        // Player joins the game
        self.game.joinGame(
            player: self.player, 
            payment: <- self.payment,
            schedulingFund: <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
        )
        
        log("Player ".concat(self.player.toString()).concat(" joined game ").concat(self.game.gameId.toString()))
    }
}