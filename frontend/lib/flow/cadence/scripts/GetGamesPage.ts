export const GET_GAMES_PAGE = `
import MinorityRuleGame from "MinorityRuleGame"

// Get a paginated list of games that are available for joining
// Only returns games in commitPhase (state 0) and first round (round 1)
// Parameters:
// - startId: The game ID to start from (inclusive)
// - limit: Maximum number of games to return
// - descending: If true, iterate backwards from startId; if false, iterate forwards
// Returns: {games: [{String: AnyStruct}], pagination: {String: AnyStruct}}
access(all) fun main(startId: UInt64, limit: UInt64, descending: Bool): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(MinorityRuleGame.address)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Call the getGamesPage method (now with built-in filtering and full pagination)
    return gameManager.getGamesPage(startId: startId, limit: limit, descending: descending)
}
`;