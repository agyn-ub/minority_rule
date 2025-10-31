import MinorityRuleGame from "MinorityRuleGame"

// Get list of all games with their current status - useful for monitoring dashboard
access(all) fun main(maxGames: UInt64?): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get contract state to know how many games exist
    let contractAccount2 = getAccount(0xb69240f6be3e34ca)
    let nextGameId = MinorityRuleGame.nextGameId
    
    var gamesList: [{String: AnyStruct}] = []
    let limit = maxGames ?? nextGameId
    let actualLimit = limit < nextGameId ? limit : nextGameId - 1
    
    // Check each game ID (starting from 1)
    var gameId: UInt64 = 1
    while gameId <= actualLimit {
        if let game = gameManager.borrowGame(gameId: gameId) {
            let gameInfo = game.getGameInfo()
            let phaseInfo = game.getCurrentPhaseInfo()
            
            // State name mapping
            let stateNames = ["setCommitDeadline", "setRevealDeadline", "commitPhase", "revealPhase", "processingRound", "completed"]
            let stateRawValue = gameInfo["state"] as! UInt8
            let stateName = stateNames[stateRawValue]
            
            let gameData: {String: AnyStruct} = {
                "gameId": gameInfo["gameId"]!,
                "questionText": gameInfo["questionText"]!,
                "creator": gameInfo["creator"]!,
                "entryFee": gameInfo["entryFee"]!,
                "state": gameInfo["state"]!,
                "stateName": stateName,
                "currentRound": gameInfo["currentRound"]!,
                "totalPlayers": gameInfo["totalPlayers"]!,
                "remainingPlayers": (gameInfo["remainingPlayers"] as! [Address]).length,
                "prizePool": gameInfo["prizePool"]!,
                "isActive": stateName != "completed",
                "timeRemaining": phaseInfo["timeRemaining"]!,
                "commitCount": gameInfo["commitCount"]!,
                "revealCount": gameInfo["revealCount"]!
            }
            
            gamesList.append(gameData)
        }
        gameId = gameId + 1
    }
    
    // Categorize games
    var activeGames: [{String: AnyStruct}] = []
    var completedGames: [{String: AnyStruct}] = []
    var waitingForScheduling: [{String: AnyStruct}] = []
    
    for gameData in gamesList {
        let stateName = gameData["stateName"] as! String
        let isActive = gameData["isActive"] as! Bool
        
        if stateName == "completed" {
            completedGames.append(gameData)
        } else if stateName == "setCommitDeadline" || stateName == "setRevealDeadline" {
            waitingForScheduling.append(gameData)
        } else {
            activeGames.append(gameData)
        }
    }
    
    let summary: {String: AnyStruct} = {
        "totalGames": gamesList.length,
        "activeGames": activeGames.length,
        "completedGames": completedGames.length,
        "waitingForScheduling": waitingForScheduling.length,
        "nextGameId": nextGameId,
        
        // Game lists
        "allGames": gamesList,
        "activeGamesList": activeGames,
        "completedGamesList": completedGames,
        "waitingForSchedulingList": waitingForScheduling,
        
        // Quick stats
        "totalActivePlayers": getTotalActivePlayers(games: activeGames),
        "totalPrizePool": getTotalPrizePool(games: gamesList)
    }
    
    return summary
}

// Helper function to count total active players across all games
access(all) fun getTotalActivePlayers(games: [{String: AnyStruct}]): UInt32 {
    var total: UInt32 = 0
    for game in games {
        let remainingPlayers = game["remainingPlayers"] as! Int
        total = total + UInt32(remainingPlayers)
    }
    return total
}

// Helper function to calculate total prize pool across all games
access(all) fun getTotalPrizePool(games: [{String: AnyStruct}]): UFix64 {
    var total: UFix64 = 0.0
    for game in games {
        let prizePool = game["prizePool"] as! UFix64
        total = total + prizePool
    }
    return total
}