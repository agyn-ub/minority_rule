import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, durationInSeconds: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let creator: Address
    
    prepare(signer: &Account) {
        self.creator = signer.address
        
        // Get the contract account
        let contractAccount = getAccount(0xfe89b379c3f4ac9b)
        
        // Borrow the game manager from public path
        self.gameManager = contractAccount
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public path")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Set reveal deadline (this transitions to reveal phase)
        game.setRevealDeadline(creator: self.creator, duration: durationInSeconds)
        
        log("Reveal deadline set for game "
            .concat(gameId.toString())
            .concat(" - Duration: ")
            .concat(durationInSeconds.toString())
            .concat(" seconds"))
        log("Game transitioned to reveal phase")
    }
}