import MinorityRuleGame from 0x1aee0aa4d20eac44

transaction(gameId: UInt64, commitHash: String) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let playerAddress: Address
    
    prepare(signer: &Account) {
        self.playerAddress = signer.address
        
        // Get the contract account
        let contractAddress = Address(0x1aee0aa4d20eac44) // New commit-reveal contract address
        let contractAccount = getAccount(contractAddress)
        
        // Borrow the game manager from public path
        self.gameManager = contractAccount
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public path")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Submit the commitment hash
        game.submitCommit(player: self.playerAddress, commitHash: commitHash)
        
        log("Vote commitment submitted for game ".concat(gameId.toString()))
    }
}