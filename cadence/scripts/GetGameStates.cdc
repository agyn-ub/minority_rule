import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

// Check the states and rounds of all games for debugging
access(all) fun main(): [{String: AnyStruct}] {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    var gameStates: [{String: AnyStruct}] = []
    let totalGames = gameManager.getTotalGamesCount()
    
    var gameId: UInt64 = 1
    while gameId <= totalGames {
        if let gameRef = gameManager.borrowGame(gameId: gameId) {
            let gameInfo = gameRef.getGameInfo()
            let state = gameInfo["state"] as! UInt8
            let currentRound = gameInfo["currentRound"] as! UInt8
            let totalPlayers = gameInfo["totalPlayers"] as! UInt32
            
            gameStates.append({
                "gameId": gameId,
                "state": state,
                "currentRound": currentRound,
                "totalPlayers": totalPlayers,
                "isAvailable": state == 2 && currentRound == 1
            })
        }
        gameId = gameId + 1
    }
    
    return gameStates
}