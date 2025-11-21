export const GET_PLAYER_GAME_HISTORY = `
import MinorityRuleGame from 0xMinorityRuleGame

// Get games where a player participated - efficient for history page
access(all) fun main(player: Address, limit: UInt64): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xMinorityRuleGame)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get game IDs where this player participated using getUserGameHistory
    let gameIds = gameManager.getUserGameHistory(player: player)
    
    // Limit the results if requested
    var limitedGameIds: [UInt64] = []
    var count: UInt64 = 0
    for gameId in gameIds {
        if count < limit {
            limitedGameIds.append(gameId)
            count = count + 1
        }
    }
    
    // Get detailed information for each game including player status
    var gamesList: [{String: AnyStruct}] = []
    
    for gameId in limitedGameIds {
        if let game = gameManager.borrowGame(gameId: gameId) {
            let gameInfo = game.getGameInfo()
            let phaseInfo = game.getPhaseInfo()
            
            // Get state name from phase info
            let stateName = phaseInfo["stateName"] as! String
            
            // Get player-specific information
            let isCreator = (gameInfo["creator"] as! Address) == player
            let isActive = (gameInfo["remainingPlayers"] as! [Address]).contains(player)
            let isWinner = (gameInfo["winners"] as! [Address]).contains(player)
            let playerVoteHistory = (gameInfo["playerVoteHistory"] as! {Address: [AnyStruct]})[player] ?? []
            
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
                "commitDeadlineFormatted": phaseInfo["commitDeadlineFormatted"]!,
                "revealDeadlineFormatted": phaseInfo["revealDeadlineFormatted"]!,
                "commitCount": gameInfo["commitCount"]!,
                "revealCount": gameInfo["revealCount"]!,
                
                // Player-specific data
                "playerStatus": {
                    "isCreator": isCreator,
                    "isActivePlayer": isActive,
                    "isWinner": isWinner,
                    "totalRoundsPlayed": playerVoteHistory.length,
                    "voteHistory": playerVoteHistory
                }
            }
            
            gamesList.append(gameData)
        }
    }
    
    // Categorize games by player's relationship
    var createdGames: [{String: AnyStruct}] = []
    var playedGames: [{String: AnyStruct}] = []
    var wonGames: [{String: AnyStruct}] = []
    var activeGames: [{String: AnyStruct}] = []
    var completedGames: [{String: AnyStruct}] = []
    
    for gameData in gamesList {
        let playerStatus = gameData["playerStatus"] as! {String: AnyStruct}
        let stateName = gameData["stateName"] as! String
        
        if playerStatus["isCreator"] as! Bool {
            createdGames.append(gameData)
        } else {
            playedGames.append(gameData)
        }
        
        if playerStatus["isWinner"] as! Bool {
            wonGames.append(gameData)
        }
        
        if stateName != "completed" {
            activeGames.append(gameData)
        } else {
            completedGames.append(gameData)
        }
    }
    
    let result: {String: AnyStruct} = {
        "player": player,
        "totalGamesParticipated": gamesList.length,
        "gamesCreated": createdGames.length,
        "gamesPlayed": playedGames.length,
        "gamesWon": wonGames.length,
        "activeParticipation": activeGames.length,
        
        // Game lists
        "allGames": gamesList,
        "createdGamesList": createdGames,
        "playedGamesList": playedGames,
        "wonGamesList": wonGames,
        "activeGamesList": activeGames,
        "completedGamesList": completedGames,
        
        // Player statistics
        "winRate": gamesList.length > 0 ? 
            Float(wonGames.length) / Float(gamesList.length) : 0.0,
        
        // Metadata
        "limit": limit,
        "returnedCount": UInt64(gamesList.length)
    }
    
    return result
}
`;