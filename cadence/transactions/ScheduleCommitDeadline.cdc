import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, durationInSeconds: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let creator: Address
    
    prepare(signer: &Account) {
        self.creator = signer.address
        
        // Get the contract account
        let contractAccount = getAccount(0x44a19c1836c03e74)
        
        // Borrow the game manager from public path
        self.gameManager = contractAccount
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public path")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Schedule commit deadline (for Forte scheduling)
        game.scheduleCommitDeadline(creator: self.creator, duration: durationInSeconds)
        
        log("Commit deadline scheduled for game "
            .concat(gameId.toString())
            .concat(" - Duration: ")
            .concat(durationInSeconds.toString())
            .concat(" seconds"))
        log("Game state: setRevealDeadline - Now configure Forte scheduler for commit deadline")
    }
}