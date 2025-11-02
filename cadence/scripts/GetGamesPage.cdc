import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

// Get a paginated list of games
// Parameters:
// - startId: The game ID to start from (inclusive)
// - limit: Maximum number of games to return
// - descending: If true, iterate backwards from startId; if false, iterate forwards
access(all) fun main(startId: UInt64, limit: UInt64, descending: Bool): [{String: AnyStruct}] {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Call the getGamesPage method
    return gameManager.getGamesPage(startId: startId, limit: limit, descending: descending)
}