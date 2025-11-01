export const SUBMIT_VOTE = `
import MinorityRuleGame from 0xb69240f6be3e34ca

transaction(gameId: UInt64, vote: Bool) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let player: Address
    
    prepare(signer: auth(Storage) &Account) {
        self.player = signer.address
        
        let contractAddress = Address(0xb69240f6be3e34ca)
        
        // Borrow the game manager from public capability
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
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
`;