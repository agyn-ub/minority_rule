export const SUBMIT_REVEAL = `
import MinorityRuleGame from 0xb69240f6be3e34ca

transaction(gameId: UInt64, vote: Bool, salt: String) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    let player: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.player = signer.address
        
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(0xb69240f6be3e34ca)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        // Submit vote reveal (actual vote + salt for verification)
        self.game.submitReveal(player: self.player, vote: vote, salt: salt)
        
        let voteText = vote ? "YES" : "NO"
        log("Player ".concat(self.player.toString())
            .concat(" revealed vote ").concat(voteText)
            .concat(" for game ").concat(gameId.toString())
            .concat(" with salt: ").concat(salt))
    }
}
`;