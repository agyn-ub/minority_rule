import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

transaction(gameId: UInt64, vote: Bool) {
    
    let gameManager: &MinorityRuleGame.GameManager
    let gameTicket: &MinorityRuleGame.GameTicket
    let player: Address
    
    prepare(signer: auth(Storage) &Account) {
        self.player = signer.address
        
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
        
        // Get player's game ticket for this game
        let ticketPath = StoragePath(identifier: "MinorityRuleGameTicket_".concat(gameId.toString()))!
        self.gameTicket = signer.storage.borrow<&MinorityRuleGame.GameTicket>(from: ticketPath)
            ?? panic("No game ticket found - player must join game first")
    }
    
    execute {
        // Get the game and submit vote
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        game.submitVote(player: self.player, vote: vote, ticket: self.gameTicket)
        
        log("Player ".concat(self.player.toString())
            .concat(" voted ")
            .concat(vote ? "YES" : "NO")
            .concat(" in game ")
            .concat(gameId.toString()))
    }
}