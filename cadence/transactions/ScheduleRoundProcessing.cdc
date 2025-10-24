import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import MinorityGameTransactionHandler from "../contracts/MinorityGameTransactionHandler.cdc"

// This transaction schedules automatic round processing for a game
transaction(gameId: UInt64) {
    
    let gameManager: &MinorityRuleGame.GameManager
    
    prepare(signer: auth(Storage) &Account) {
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Only schedule if game is in voting state
        if game.state == MinorityRuleGame.GameState.votingOpen {
            // Schedule round processing at the deadline
            MinorityGameTransactionHandler.scheduleRoundProcessing(
                gameId: gameId,
                roundNumber: game.currentRound,
                deadline: game.roundDeadline
            )
            
            log("Scheduled round processing for game "
                .concat(gameId.toString())
                .concat(" round ")
                .concat(game.currentRound.toString())
                .concat(" at timestamp ")
                .concat(game.roundDeadline.toString()))
        } else {
            log("Game is not in voting state, scheduling skipped")
        }
    }
}