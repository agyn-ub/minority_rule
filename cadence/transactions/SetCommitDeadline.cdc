import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, durationInSeconds: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let creator: Address
    
    prepare(signer: &Account) {
        self.creator = signer.address
        
        // Get the contract account
        let contractAccount = getAccount(0x1aee0aa4d20eac44)
        
        // Borrow the game manager from public path
        self.gameManager = contractAccount
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public path")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Set commit deadline
        game.setCommitDeadline(creator: self.creator, duration: durationInSeconds)
        
        log("Commit deadline set for game "
            .concat(gameId.toString())
            .concat(" - Duration: ")
            .concat(durationInSeconds.toString())
            .concat(" seconds"))
    }
}