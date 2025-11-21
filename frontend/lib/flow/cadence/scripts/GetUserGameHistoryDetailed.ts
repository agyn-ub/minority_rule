export const GET_USER_GAME_HISTORY_DETAILED = `
import MinorityRuleGame from 0xMinorityRuleGame

// Get detailed information about all games a user has participated in
access(all) fun main(userAddress: Address): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xMinorityRuleGame)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the user's game history (just the IDs)
    let gameIds = gameManager.getUserGameHistory(player: userAddress)
    
    // Get detailed information for each game
    var gameDetails: [{String: AnyStruct}] = []
    
    for gameId in gameIds {
        if let gameRef = gameManager.borrowGame(gameId: gameId) {
            let gameInfo = gameRef.getGameInfo()
            
            // Add user-specific information
            let playerVoteHistory = gameInfo["playerVoteHistory"] as! {Address: [AnyStruct]}
            let userVotes = playerVoteHistory[userAddress] ?? []
            
            // Enhanced game info with user-specific data
            let enhancedGameInfo: {String: AnyStruct} = {
                "gameId": gameInfo["gameId"]!,
                "questionText": gameInfo["questionText"]!,
                "entryFee": gameInfo["entryFee"]!,
                "creator": gameInfo["creator"]!,
                "state": gameInfo["state"]!,
                "currentRound": gameInfo["currentRound"]!,
                "totalPlayers": gameInfo["totalPlayers"]!,
                "prizePool": gameInfo["prizePool"]!,
                "remainingPlayers": gameInfo["remainingPlayers"]!,
                "winners": gameInfo["winners"]!,
                "roundResults": gameInfo["roundResults"]!,
                "prizesDistributed": gameInfo["prizesDistributed"]!,
                
                // User-specific data
                "userVoteHistory": userVotes,
                "userStillInGame": (gameInfo["remainingPlayers"]! as! [Address]).contains(userAddress),
                "userIsWinner": (gameInfo["winners"]! as! [Address]).contains(userAddress),
                "userTotalVotes": userVotes.length
            }
            
            gameDetails.append(enhancedGameInfo)
        }
    }
    
    return {
        "userAddress": userAddress,
        "totalGamesParticipated": gameIds.length,
        "gameIds": gameIds,
        "gameDetails": gameDetails
    }
}
`;