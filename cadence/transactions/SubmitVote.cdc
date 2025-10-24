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
        
        // Note: Without storing tickets, we can't prevent users from voting without joining
        // In production, you'd need either:
        // 1. Store tickets (costs storage)
        // 2. Check events to verify player joined (requires indexer)
        // 3. Use a one-time voting NFT per round
        
        log("Note: This simplified version doesn't verify player joined the game")
        log("In production, implement proper verification")
        
        // For demo purposes, we'll comment out the vote submission
        // game.submitVote(player: self.player, vote: vote, ticket: ???)
        
        log("Player ".concat(self.player.toString())
            .concat(" attempted to vote ")
            .concat(vote ? "YES" : "NO")
            .concat(" in game ")
            .concat(gameId.toString()))
    }
}