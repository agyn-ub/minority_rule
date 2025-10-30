import MinorityRuleGame from "MinorityRuleGame"

// Forte callback transaction: Transition to reveal phase when commit deadline reached
transaction(gameId: UInt64, duration: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    
    prepare(signer: &Account) {
        // Get the contract account
        let contractAccount = getAccount(0x0cba6f974b0aa625)
        
        // Borrow the game manager from public path
        self.gameManager = contractAccount
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public path")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Activate reveal phase (called by Forte scheduler when commit deadline reached)
        game.activateRevealPhase(duration: duration)
        
        log("Reveal phase activated for game "
            .concat(gameId.toString())
            .concat(" - Players can now reveal their votes"))
    }
}