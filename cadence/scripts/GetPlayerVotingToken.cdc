import MinorityRuleGame from "MinorityRuleGame"

// Check player status in games
// Note: In the current implementation, player data is stored in the contract
access(all) fun main(playerAddress: Address, gameId: UInt64, contractAddress: Address): {String: AnyStruct}? {
    
    let gameManager = getAccount(contractAddress)
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public capability")
    
    if let game = gameManager.borrowGame(gameId: gameId) {
        let info = game.getGameInfo()
        
        // Check if player is in the game
        let players = info["players"] as! [Address]? ?? []
        let remainingPlayers = info["remainingPlayers"] as! [Address]? ?? []
        
        if players.contains(playerAddress) {
            return {
                "gameId": gameId,
                "isPlayer": true,
                "isActive": remainingPlayers.contains(playerAddress),
                "gameState": info["state"]
            }
        }
    }
    
    return nil
}