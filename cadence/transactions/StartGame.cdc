import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
import MinorityGameTransactionHandler from "../contracts/MinorityGameTransactionHandler.cdc"

transaction(gameId: UInt64) {
    
    let gameManager: &MinorityRuleGame.GameManager
    
    prepare(signer: auth(Storage) &Account) {
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
    }
    
    execute {
        // Get and start the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        game.startGame()
        
        log("Game ".concat(gameId.toString()).concat(" has been started"))
        
        // If game is in voting state (not immediately ended), schedule round processing
        if game.state == MinorityRuleGame.GameState.votingOpen {
            MinorityGameTransactionHandler.scheduleRoundProcessing(
                gameId: gameId,
                roundNumber: game.currentRound,
                deadline: game.roundDeadline
            )
            log("Scheduled automatic round processing at deadline")
        }
    }
}