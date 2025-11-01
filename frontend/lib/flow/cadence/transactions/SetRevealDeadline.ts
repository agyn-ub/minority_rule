export const SET_REVEAL_DEADLINE = `
import MinorityRuleGame from 0xb69240f6be3e34ca

transaction(gameId: UInt64, durationSeconds: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(0xb69240f6be3e34ca)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        // Set reveal deadline for the game (duration in seconds from now)
        self.game.setRevealDeadline(durationSeconds: durationSeconds)
        
        log("Reveal deadline set for game ".concat(gameId.toString())
            .concat(" to ").concat(durationSeconds.toString()).concat(" seconds from now"))
    }
}
`;