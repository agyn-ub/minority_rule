import MinorityRuleGame from "MinorityRuleGame"

access(all) fun main(gameId: UInt64, round: UInt8, contractAddress: Address): {String: UFix64}? {
    // Get the contract account
    let contractAccount = getAccount(contractAddress)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the game
    if let game = gameManager.borrowGame(gameId: gameId) {
        return game.getRoundTimings(round: round)
    }
    
    return nil
}