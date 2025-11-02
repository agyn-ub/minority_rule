export const GET_GAMES_PAGE = `
import MinorityRuleGame from 0xb69240f6be3e34ca

// Generic pagination script using efficient contract method
access(all) fun main(startId: UInt64, limit: UInt64, descending: Bool): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get total games count for pagination metadata
    let totalGamesCount = gameManager.getTotalGamesCount()
    
    // Get paginated games directly from contract
    let rawGames = gameManager.getGamesPage(startId: startId, limit: limit, descending: descending)
    
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
    
    // Calculate pagination metadata
    let returnedCount = gamesList.length
    let hasMore = returnedCount == limit && startId > 0 // Simplified hasMore logic
    var nextStartId: UInt64? = nil
    
    if hasMore && gamesList.length > 0 {
        let lastGame = gamesList[gamesList.length - 1]
        let lastGameId = lastGame["gameId"] as! UInt64
        nextStartId = descending ? lastGameId - 1 : lastGameId + 1
    }
    
    // Categorize games
    var activeGames: [{String: AnyStruct}] = []
    var completedGames: [{String: AnyStruct}] = []
    var waitingForScheduling: [{String: AnyStruct}] = []
    
    for gameData in gamesList {
        let stateName = gameData["stateName"] as! String
        
        if stateName == "completed" {
            completedGames.append(gameData)
        } else if stateName == "setCommitDeadline" || stateName == "setRevealDeadline" {
            waitingForScheduling.append(gameData)
        } else {
            activeGames.append(gameData)
        }
    }
    
    let result: {String: AnyStruct} = {
        "totalGamesInContract": totalGamesCount,
        "returnedGames": returnedCount,
        "activeGames": activeGames.length,
        "completedGames": completedGames.length,
        "waitingForScheduling": waitingForScheduling.length,
        
        // Pagination info
        "pagination": {
            "startId": startId,
            "limit": limit,
            "descending": descending,
            "returnedCount": returnedCount,
            "hasMore": hasMore,
            "nextStartId": nextStartId
        },
        
        // Game lists
        "allGames": gamesList,
        "activeGamesList": activeGames,
        "completedGamesList": completedGames,
        "waitingForSchedulingList": waitingForScheduling
    }
    
    return result
}
`;