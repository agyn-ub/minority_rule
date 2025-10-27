import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

// Check player status in games
// Note: In the current implementation, player data is stored in the contract
access(all) fun main(playerAddress: Address, gameId: UInt64): {String: AnyStruct}? {
    // Get the contract address (replace with actual deployed address)
    let contractAddress = Address(0x73c003cd6de60fd4) // MinorityRuleGame deployed address
    
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