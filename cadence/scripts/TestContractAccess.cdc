import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

// Test if we can access the contract and get basic info
access(all) fun main(): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(MinorityRuleGame.address)
    
    // Try to borrow the game manager from public path
    if let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath) {
        
        // Successfully borrowed, get some basic info
        let totalGames = gameManager.getTotalGamesCount()
        
        return {
            "success": true,
            "totalGames": totalGames,
            "nextGameId": MinorityRuleGame.nextGameId
        }
    } else {
        // Failed to borrow
        return {
            "success": false,
            "error": "Could not borrow game manager from public path",
            "nextGameId": MinorityRuleGame.nextGameId
        }
    }
}