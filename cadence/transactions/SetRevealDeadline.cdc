import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, durationInSeconds: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let creator: Address
    
    prepare(signer: &Account) {
        self.creator = signer.address
        
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
        
        // Schedule reveal deadline (for Forte scheduling - doesn't transition yet)
        game.scheduleRevealDeadline(creator: self.creator, duration: durationInSeconds)
        
        log("Reveal deadline scheduled for game "
            .concat(gameId.toString())
            .concat(" - Duration: ")
            .concat(durationInSeconds.toString())
            .concat(" seconds - Now configure Forte scheduler"))
        log("Game will transition to reveal phase when Forte activates it")
    }
}