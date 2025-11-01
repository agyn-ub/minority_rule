export const JOIN_GAME = `
import MinorityRuleGame from 0xb69240f6be3e34ca
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

transaction(gameId: UInt64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    let payment: @{FungibleToken.Vault}
    let player: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.player = signer.address
        
        let contractAddress = Address(0xb69240f6be3e34ca)
        
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
        // Join the game
        self.game.joinGame(player: self.player, payment: <- self.payment)
        
        log("Player ".concat(self.player.toString()).concat(" joined game ").concat(gameId.toString()))
    }
}
`;