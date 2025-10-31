import MinorityRuleGame from "MinorityRuleGame"

// Get current phase information with timing details for monitoring
access(all) fun main(gameId: UInt64): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
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
    let stateNames = ["commitPhase", "revealPhase", "processingRound", "completed"]
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
        "commitDeadlineFormatted": phaseInfo["commitDeadlineFormatted"]!,
        "revealDeadline": phaseInfo["revealDeadline"]!,
        "revealDeadlineFormatted": phaseInfo["revealDeadlineFormatted"]!,
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
        case "commitPhase":
            return "Players can submit commits, scheduled handler will trigger reveal phase"
        case "revealPhase":
            return "Players can reveal votes, scheduled handler will process round"
        case "processingRound":
            return "Processing in progress"
        case "completed":
            return "Game finished, prizes distributed"
        default:
            return "Unknown state"
    }
}