export const GET_RECENT_GAMES = `
import MinorityRuleGame from 0xb69240f6be3e34ca

// Get recent games - most efficient for dashboard
access(all) fun main(limit: UInt64): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get total games count
    let totalGamesCount = gameManager.getTotalGamesCount()
    
    // Get recent games directly from contract (most efficient method)
    let rawGames = gameManager.getRecentGames(limit: limit)
    
    // Enhance game data with additional information
    var gamesList: [{String: AnyStruct}] = []
    
    for gameInfo in rawGames {
        // State name mapping
        let stateNames = ["setCommitDeadline", "setRevealDeadline", "commitPhase", "revealPhase", "processingRound", "completed"]
        let stateRawValue = gameInfo["state"] as! UInt8
        let stateName = stateNames[stateRawValue]
        
        // Get additional phase information
        let gameId = gameInfo["gameId"] as! UInt64
        var timeRemainingInPhase: String = "No time limit"
        var commitDeadlineFormatted: String = ""
        var revealDeadlineFormatted: String = ""
        
        if let game = gameManager.borrowGame(gameId: gameId) {
            let phaseInfo = game.getCurrentPhaseInfo()
            timeRemainingInPhase = phaseInfo["timeRemaining"] as! String
            commitDeadlineFormatted = game.getCommitDeadlineFormatted()
            revealDeadlineFormatted = game.getRevealDeadlineFormatted()
        }
        
        let enhancedGameData: {String: AnyStruct} = {
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
            "commitCount": gameInfo["commitCount"]!,
            "revealCount": gameInfo["revealCount"]!,
            "commitDeadline": gameInfo["commitDeadline"]!,
            "revealDeadline": gameInfo["revealDeadline"]!,
            "timeRemainingInPhase": timeRemainingInPhase,
            "commitDeadlineFormatted": commitDeadlineFormatted,
            "revealDeadlineFormatted": revealDeadlineFormatted
        }
        
        gamesList.append(enhancedGameData)
    }
    
    // Categorize games
    var activeGames: [{String: AnyStruct}] = []
    var completedGames: [{String: AnyStruct}] = []
    var waitingForScheduling: [{String: AnyStruct}] = []
    var availableToJoin: [{String: AnyStruct}] = []
    
    for gameData in gamesList {
        let stateName = gameData["stateName"] as! String
        let currentRound = gameData["currentRound"] as! UInt8
        
        if stateName == "completed" {
            completedGames.append(gameData)
        } else if stateName == "setCommitDeadline" || stateName == "setRevealDeadline" {
            waitingForScheduling.append(gameData)
        } else {
            activeGames.append(gameData)
            
            // Games available to join (Round 1, commit phase)
            if stateName == "commitPhase" && currentRound == 1 {
                availableToJoin.append(gameData)
            }
        }
    }
    
    // Calculate summary statistics
    let totalActivePlayers = getTotalActivePlayers(games: activeGames)
    let totalPrizePool = getTotalPrizePool(games: gamesList)
    
    let result: {String: AnyStruct} = {
        "totalGamesInContract": totalGamesCount,
        "returnedGames": gamesList.length,
        "activeGames": activeGames.length,
        "completedGames": completedGames.length,
        "waitingForScheduling": waitingForScheduling.length,
        "availableToJoin": availableToJoin.length,
        
        // Game lists
        "allGames": gamesList,
        "activeGamesList": activeGames,
        "completedGamesList": completedGames,
        "waitingForSchedulingList": waitingForScheduling,
        "availableToJoinList": availableToJoin,
        
        // Statistics
        "totalActivePlayers": totalActivePlayers,
        "totalPrizePool": totalPrizePool,
        
        // Metadata
        "limit": limit,
        "isRecent": true,
        "fetchedAt": getCurrentBlock().timestamp
    }
    
    return result
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
`;