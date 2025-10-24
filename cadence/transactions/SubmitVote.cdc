import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

transaction(gameId: UInt64, vote: Bool) {
    
    let gameManager: &MinorityRuleGame.GameManager
    let player: Address
    
    prepare(signer: auth(Storage) &Account) {
        self.player = signer.address
        
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Submit vote - contract verifies player is in remainingPlayers
        game.submitVote(player: self.player, vote: vote)
        
        log("Player ".concat(self.player.toString())
            .concat(" voted ")
            .concat(vote ? "YES" : "NO")
            .concat(" in game ")
            .concat(gameId.toString()))
    }
}