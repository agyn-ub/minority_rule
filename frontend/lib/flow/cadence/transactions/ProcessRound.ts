export const PROCESS_ROUND = `
import MinorityRuleGame from 0xMinorityRuleGame

transaction(gameId: UInt64, contractAddress: Address) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        // Process the current round
        self.game.processRound()
        
        log("Round processed for game ".concat(gameId.toString()))
    }
}
`;