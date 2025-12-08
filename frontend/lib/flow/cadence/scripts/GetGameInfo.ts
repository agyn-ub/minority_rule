export const GET_GAME_INFO = `
import MinorityRuleGame from 0xMinorityRuleGame

// Get comprehensive information about a specific game
access(all) fun main(gameId: UInt64, contractAddress: Address): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(contractAddress)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the game
    let game = gameManager.borrowGame(gameId: gameId)
        ?? panic("Game not found")
    
    // Get comprehensive game information
    let gameInfo = game.getGameInfo()
    
    // Add state name for better readability
    let stateNames = ["zeroPhase", "commitPhase", "revealPhase", "processingRound", "completed"]
    let stateRawValue = gameInfo["state"] as! UInt8
    
    // Enhanced game info with additional details
    let enhancedInfo: {String: AnyStruct} = {
        // Basic game info
        "gameId": gameInfo["gameId"]!,
        "questionText": gameInfo["questionText"]!,
        "entryFee": gameInfo["entryFee"]!,
        "creator": gameInfo["creator"]!,
        
        // State information
        "state": gameInfo["state"]!,
        "stateName": stateNames[stateRawValue],
        "currentRound": gameInfo["currentRound"]!,
        
        // Player information
        "totalPlayers": gameInfo["totalPlayers"]!,
        "players": gameInfo["players"]!,
        "remainingPlayers": gameInfo["remainingPlayers"]!,
        "winners": gameInfo["winners"]!,
        
        // Current round voting
        "currentYesVotes": gameInfo["currentYesVotes"]!,
        "currentNoVotes": gameInfo["currentNoVotes"]!,
        "commitCount": gameInfo["commitCount"]!,
        "revealCount": gameInfo["revealCount"]!,
        
        // Financial info
        "prizePool": gameInfo["prizePool"]!,
        "prizesDistributed": gameInfo["prizesDistributed"]!,
        
        // Timing info
        "commitDeadline": gameInfo["commitDeadline"]!,
        "revealDeadline": gameInfo["revealDeadline"]!,
        "timeRemainingInPhase": game.getTimeRemainingInPhase(),
        
        // Historical data
        "roundResults": gameInfo["roundResults"]!,
        "playerVoteHistory": gameInfo["playerVoteHistory"]!
    }
    
    return enhancedInfo
}
`;