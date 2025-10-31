import MinorityRuleGame from "MinorityRuleGame"

// Get specific player's status and participation in a game
access(all) fun main(gameId: UInt64, playerAddress: Address): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the game
    let game = gameManager.borrowGame(gameId: gameId)
        ?? panic("Game not found")
    
    // Get game info for analysis
    let gameInfo = game.getGameInfo()
    let players = gameInfo["players"] as! [Address]
    let remainingPlayers = gameInfo["remainingPlayers"] as! [Address]
    let playerVoteHistory = gameInfo["playerVoteHistory"] as! {Address: [MinorityRuleGame.VoteRecord]}
    let currentRound = gameInfo["currentRound"] as! UInt8
    let winners = gameInfo["winners"] as! [Address]
    let commitCount = gameInfo["commitCount"] as! Int
    let revealCount = gameInfo["revealCount"] as! Int
    
    // Check player's participation status
    let hasJoined = players.contains(playerAddress)
    let isRemaining = remainingPlayers.contains(playerAddress)
    let isWinner = winners.contains(playerAddress)
    
    // Get player's vote history
    let voteHistory = playerVoteHistory[playerAddress] ?? []
    
    // Analyze current round participation
    var hasCommittedThisRound = false
    var hasRevealedThisRound = false
    var currentRoundVote: Bool? = nil
    
    // Check commits and reveals (we can infer from the counts and game state)
    // Note: We can't directly access currentRoundCommits/Reveals from script,
    // but we can infer participation from vote history and timing
    
    // Get latest vote if any
    if voteHistory.length > 0 {
        let latestVote = voteHistory[voteHistory.length - 1]
        if latestVote.round == currentRound {
            hasRevealedThisRound = true
            currentRoundVote = latestVote.vote
        }
    }
    
    // Player status summary
    let playerStatus: {String: AnyStruct} = {
        // Basic info
        "gameId": gameId,
        "playerAddress": playerAddress,
        "currentRound": currentRound,
        
        // Participation status
        "hasJoined": hasJoined,
        "isActive": isRemaining,
        "isEliminated": hasJoined && !isRemaining && winners.length == 0,
        "isWinner": isWinner,
        
        // Current round status
        "hasRevealedThisRound": hasRevealedThisRound,
        "currentRoundVote": currentRoundVote,
        
        // Historical data
        "totalRoundsPlayed": voteHistory.length,
        "voteHistory": voteHistory,
        
        // Game context
        "totalCommitsThisRound": commitCount,
        "totalRevealsThisRound": revealCount,
        
        // Status summary
        "status": getPlayerStatusSummary(
            hasJoined: hasJoined,
            isRemaining: isRemaining,
            isWinner: isWinner,
            hasRevealedThisRound: hasRevealedThisRound,
            gameCompleted: winners.length > 0
        )
    }
    
    return playerStatus
}

// Helper function to get player status summary
access(all) fun getPlayerStatusSummary(
    hasJoined: Bool,
    isRemaining: Bool, 
    isWinner: Bool,
    hasRevealedThisRound: Bool,
    gameCompleted: Bool
): String {
    if !hasJoined {
        return "Not joined"
    }
    
    if isWinner {
        return "Winner! 🏆"
    }
    
    if gameCompleted && !isWinner {
        return "Eliminated"
    }
    
    if !isRemaining {
        return "Eliminated in previous round"
    }
    
    if hasRevealedThisRound {
        return "Active - Vote revealed this round"
    }
    
    return "Active - Participating in current round"
}