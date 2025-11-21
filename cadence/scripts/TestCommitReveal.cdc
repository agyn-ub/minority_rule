import "MinorityRuleGame"

access(all) fun main(gameId: UInt64, commitHash: String, vote: Bool, salt: String, contractAddress: Address): {String: String} {
    // Get the game manager from the contract account
    let gameManager = getAccount(contractAddress)
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public capability")
    
    // Get the game
    let game = gameManager.borrowGame(gameId: gameId)
        ?? panic("Game not found")
    
    // Run the test and return results
    return game.testCommitReveal(commitHash: commitHash, vote: vote, salt: salt)
}