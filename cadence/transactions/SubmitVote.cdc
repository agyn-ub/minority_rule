import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

transaction(gameId: UInt64, vote: Bool) {
    
    let gameManager: &MinorityRuleGame.GameManager
    let votingToken: &MinorityRuleGame.VotingToken
    let player: Address
    
    prepare(signer: auth(Storage) &Account) {
        self.player = signer.address
        
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
        
        // Get player's voting token
        self.votingToken = signer.storage.borrow<&MinorityRuleGame.VotingToken>(
            from: MinorityRuleGame.VotingTokenStoragePath
        ) ?? panic("No voting token found - player must join game first")
    }
    
    execute {
        // Get the game and submit vote
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        game.submitVote(player: self.player, vote: vote, token: self.votingToken)
        
        log("Player ".concat(self.player.toString())
            .concat(" voted ")
            .concat(vote ? "YES" : "NO")
            .concat(" in game ")
            .concat(gameId.toString()))
    }
}