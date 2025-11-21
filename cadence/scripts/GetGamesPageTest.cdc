import "MinorityRuleGame"

// Test script for the updated getGamesPage method
access(all) fun main(startId: UInt64, limit: UInt64, descending: Bool, contractAddress: Address): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(contractAddress)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Call the getGamesPage method (now with built-in filtering and full pagination)
    return gameManager.getGamesPage(startId: startId, limit: limit)
}