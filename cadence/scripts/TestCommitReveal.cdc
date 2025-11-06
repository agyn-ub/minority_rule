import MinorityRuleGame from 0xb69240f6be3e34ca

access(all) fun main(gameId: UInt64, commitHash: String, vote: Bool, salt: String): {String: String} {
    // Get the game manager from the contract account
    let gameManager = getAccount(MinorityRuleGame.address)
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public capability")
    
    // Get the game
    let game = gameManager.borrowGame(gameId: gameId)
        ?? panic("Game not found")
    
    // Run the test and return results
    return game.testCommitReveal(commitHash: commitHash, vote: vote, salt: salt)
}