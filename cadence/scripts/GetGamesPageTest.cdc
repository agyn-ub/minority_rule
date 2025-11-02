import MinorityRuleGame from 0xb69240f6be3e34ca

// Test script for the updated getGamesPage method
access(all) fun main(startId: UInt64, limit: UInt64, descending: Bool): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Call the getGamesPage method (now with built-in filtering and full pagination)
    return gameManager.getGamesPage(startId: startId, limit: limit, descending: descending)
}