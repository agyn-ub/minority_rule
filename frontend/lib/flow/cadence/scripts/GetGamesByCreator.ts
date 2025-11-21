export const GET_GAMES_BY_CREATOR = `
import MinorityRuleGame from 0xMinorityRuleGame

// Get games created by a specific user - efficient for "My Games" tab
access(all) fun main(creator: Address, limit: UInt64): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xMinorityRuleGame)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get all games via pagination and filter by creator
    let allGames = gameManager.getGamesPage(startId: 1, limit: limit)
    let games = allGames["games"] as! [{String: AnyStruct}]
    
    // Filter games by creator
    var creatorGames: [UInt64] = []
    for gameData in games {
        let gameCreator = gameData["creator"] as! Address
        if gameCreator == creator {
            let gameId = gameData["gameId"] as! UInt64
            creatorGames.append(gameId)
        }
    }
    
    // Get detailed information for each game
    var gamesList: [{String: AnyStruct}] = []
    
    for gameId in creatorGames {
        if let game = gameManager.borrowGame(gameId: gameId) {
            let gameInfo = game.getGameInfo()
            let phaseInfo = game.getPhaseInfo()
            
            // Get state name from phase info
            let stateName = phaseInfo["stateName"] as! String
            
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
                "revealCount": gameInfo["revealCount"]!,
                "commitDeadline": gameInfo["commitDeadline"]!,
                "commitDeadlineFormatted": phaseInfo["commitDeadlineFormatted"]!,
                "revealDeadline": gameInfo["revealDeadline"]!,
                "revealDeadlineFormatted": phaseInfo["revealDeadlineFormatted"]!,
                "timeRemainingInPhase": phaseInfo["timeRemaining"]!
            }
            
            gamesList.append(gameData)
        }
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
        "creator": creator,
        "totalCreatedGames": gamesList.length,
        "activeGames": activeGames.length,
        "completedGames": completedGames.length,
        "waitingForScheduling": waitingForScheduling.length,
        
        // Game lists
        "allGames": gamesList,
        "activeGamesList": activeGames,
        "completedGamesList": completedGames,
        "waitingForSchedulingList": waitingForScheduling,
        
        // Metadata
        "limit": limit,
        "returnedCount": gamesList.length
    }
    
    return result
}
`;