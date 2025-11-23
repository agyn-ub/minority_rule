import "MinorityRuleGame"

// Get current phase information with timing details for monitoring
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
    
    // Get current phase information with formatted times
    let phaseInfo = game.getPhaseInfo()
    
    // Add state name mapping
    let stateNames = ["zeroPhase", "commitPhase", "revealPhase", "processingRound", "completed"]
    let stateRawValue = phaseInfo["state"] as! UInt8
    let stateName = stateNames[stateRawValue]
    
    // Current timestamp for reference
    let currentTime = getCurrentBlock().timestamp
    
    // Enhanced phase info
    let enhancedPhaseInfo: {String: AnyStruct} = {
        // State information
        "gameId": gameId,
        "state": phaseInfo["state"]!,
        "stateName": stateName,
        "round": phaseInfo["round"]!,
        
        // Timing information
        "currentTime": currentTime,
        "commitDeadline": phaseInfo["commitDeadline"]!,
        "revealDeadline": phaseInfo["revealDeadline"]!,
        "timeRemaining": phaseInfo["timeRemaining"]!,
        
        // Duration information
        "currentCommitDuration": phaseInfo["currentCommitDuration"],
        "currentRevealDuration": phaseInfo["currentRevealDuration"],
        
        // Status flags
        "isActiveRound": stateName == "commitPhase" || stateName == "revealPhase",
        "isCompleted": stateName == "completed",
        
        // Next actions needed
        "nextAction": getNextAction(stateName: stateName)
    }
    
    return enhancedPhaseInfo
}

// Helper function to determine what action is needed next
access(all) fun getNextAction(stateName: String): String {
    switch stateName {
        case "zeroPhase":
            return "Creator needs to set commit deadline to begin the game"
        case "commitPhase":
            return "Players can submit commits, manual EndCommitPhase required"
        case "revealPhase":
            return "Players can reveal votes, manual ProcessRound required"
        case "processingRound":
            return "Processing in progress"
        case "completed":
            return "Game finished, prizes distributed"
        default:
            return "Unknown state"
    }
}