import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, commitHash: String) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    let player: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.player = signer.address
        
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(0xb69240f6be3e34ca)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        // Submit vote commitment (hash of vote + salt)
        self.game.submitCommit(player: self.player, commitHash: commitHash)
        
        log("Player ".concat(self.player.toString())
            .concat(" submitted commit for game ").concat(gameId.toString())
            .concat(" with hash: ").concat(commitHash))
    }
}