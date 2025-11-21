import "MinorityRuleGame"

// Get a paginated list of games
// Parameters:
// - startId: The game ID to start from (inclusive)
// - limit: Maximum number of games to return
// - contractAddress: Address of the deployed contract
access(all) fun main(startId: UInt64, limit: UInt64, contractAddress: Address): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(contractAddress)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Call the getGamesPage method
    return gameManager.getGamesPage(startId: startId, limit: limit)
}