export const JOIN_GAME = `
import MinorityRuleGame from 0xMinorityRuleGame
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

transaction(gameId: UInt64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    let payment: @{FungibleToken.Vault}
    let player: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.player = signer.address
        
        let contractAddress = 0xMinorityRuleGame
        
        // Borrow the game manager from public capability
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
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
        // Join the game (no ticket needed, no scheduling fund for non-creators)
        self.game.joinGame(player: self.player, payment: <- self.payment, schedulingFund: nil)
        
        log("Player ".concat(self.player.toString()).concat(" joined game ").concat(gameId.toString()))
    }
}
`;