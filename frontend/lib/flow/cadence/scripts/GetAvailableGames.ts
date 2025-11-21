export const GET_AVAILABLE_GAMES = `
import MinorityRuleGame from 0xMinorityRuleGame

// Get all available games that players can interact with
// Available games include: games in setup phase, commit phase, or reveal phase
access(all) fun main(): [{String: AnyStruct}] {
    
    // Get the contract account
    let contractAccount = getAccount(0xMinorityRuleGame)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get all game IDs
    let allGameIds = gameManager.getAllGameIds()
    let availableGames: [{String: AnyStruct}] = []
    
    // State names for reference
    let stateNames = ["setCommitDeadline", "setRevealDeadline", "commitPhase", "revealPhase", "processingRound", "completed"]
    
    // Check each game
    for gameId in allGameIds {
        if let game = gameManager.borrowGame(gameId: gameId) {
            let gameInfo = game.getGameInfo()
            let state = gameInfo["state"] as! UInt8
            
            // Available games are those that are not completed or processing
            // States 0-3 are available: setCommitDeadline, setRevealDeadline, commitPhase, revealPhase
            if state <= 3 {
                
                // Get enhanced game information
                let enhancedInfo: {String: AnyStruct} = {
                    // Basic game info
                    "gameId": gameInfo["gameId"]!,
                    "questionText": gameInfo["questionText"]!,
                    "entryFee": gameInfo["entryFee"]!,
                    "creator": gameInfo["creator"]!,
                    
                    // State information
                    "state": gameInfo["state"]!,
                    "stateName": stateNames[state],
                    "currentRound": gameInfo["currentRound"]!,
                    
                    // Player information
                    "totalPlayers": gameInfo["totalPlayers"]!,
                    "players": gameInfo["players"]!,
                    "remainingPlayers": gameInfo["remainingPlayers"]!,
                    
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
                    "commitDeadlineFormatted": game.getCommitDeadlineFormatted(),
                    "revealDeadline": gameInfo["revealDeadline"]!,
                    "revealDeadlineFormatted": game.getRevealDeadlineFormatted(),
                    "timeRemainingInPhase": game.getTimeRemainingInPhase(),
                    
                    // Availability info
                    "canJoin": state == 2, // Only CommitPhase allows new players
                    "canCommit": state == 2, // CommitPhase
                    "canReveal": state == 3, // RevealPhase
                    "needsSetup": state <= 1 // SetCommitDeadline or SetRevealDeadline
                }
                
                availableGames.append(enhancedInfo)
            }
        }
    }
    
    return availableGames
}
`;