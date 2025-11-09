import "MinorityRuleGame"

// Get a paginated list of games
// Parameters:
// - startId: The game ID to start from (inclusive)
// - limit: Maximum number of games to return
// - descending: If true, iterate backwards from startId; if false, iterate forwards
access(all) fun main(startId: UInt64, limit: UInt64): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xf63159eb10f911cd)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Call the getGamesPage method
    return gameManager.getGamesPage(startId: startId, limit: limit)
}