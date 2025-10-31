import MinorityRuleGame from "MinorityRuleGame"

// Get aggregated statistics across all games for analytics and monitoring
access(all) fun main(gameId: UInt64): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(0xb69240f6be3e34ca)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the specific game
    let game = gameManager.borrowGame(gameId: gameId)
        ?? panic("Game not found")
    
    // Get game info
    let gameInfo = game.getGameInfo()
    let roundResults = gameInfo["roundResults"] as! {UInt8: Bool}
    let playerVoteHistory = gameInfo["playerVoteHistory"] as! {Address: [MinorityRuleGame.VoteRecord]}
    let totalPlayers = gameInfo["totalPlayers"] as! UInt32
    let remainingPlayers = gameInfo["remainingPlayers"] as! [Address]
    let prizePool = gameInfo["prizePool"] as! UFix64
    let entryFee = gameInfo["entryFee"] as! UFix64
    let currentRound = gameInfo["currentRound"] as! UInt8
    
    // Calculate comprehensive statistics
    var totalVotesYes: UInt32 = 0
    var totalVotesNo: UInt32 = 0
    var totalVotesCast: UInt32 = 0
    var roundsWithYesMinority: UInt32 = 0
    var roundsWithNoMinority: UInt32 = 0
    
    // Player engagement stats
    var playerParticipation: {Address: UInt32} = {}
    var averageParticipationPerRound: UFix64 = 0.0
    
    // Analyze vote history
    for player in playerVoteHistory.keys {
        let voteHistory = playerVoteHistory[player]!
        playerParticipation[player] = UInt32(voteHistory.length)
        
        for voteRecord in voteHistory {
            totalVotesCast = totalVotesCast + 1
            if voteRecord.vote {
                totalVotesYes = totalVotesYes + 1
            } else {
                totalVotesNo = totalVotesNo + 1
            }
        }
    }
    
    // Analyze round results
    for round in roundResults.keys {
        let minorityVote = roundResults[round]!
        if minorityVote {
            roundsWithYesMinority = roundsWithYesMinority + 1
        } else {
            roundsWithNoMinority = roundsWithNoMinority + 1
        }
    }
    
    // Calculate average participation
    if roundResults.length > 0 {
        averageParticipationPerRound = UFix64(totalVotesCast) / UFix64(roundResults.length)
    }
    
    // Elimination statistics
    let playersEliminated = totalPlayers - UInt32(remainingPlayers.length)
    let eliminationRate = totalPlayers > 0 ? UFix64(playersEliminated) / UFix64(totalPlayers) : 0.0
    
    // Prize and financial stats
    let totalFees = UFix64(totalPlayers) * entryFee
    let platformFees = totalFees * 0.03  // 3% total fees
    let netPrizePool = totalFees - platformFees
    
    // Calculate survival difficulty (lower = easier to survive)
    let survivalDifficulty = roundResults.length > 0 ? 
        UFix64(playersEliminated) / UFix64(roundResults.length) : 0.0
    
    // Get timing statistics
    var totalCommitDuration: UFix64 = 0.0
    var totalRevealDuration: UFix64 = 0.0
    var roundsWithTiming: UInt32 = 0
    
    for round in roundResults.keys {
        let timingInfo = game.getRoundTimings(round: round)
        let commitDuration = timingInfo["commitDuration"] as! UFix64
        let revealDuration = timingInfo["revealDuration"] as! UFix64
        
        if commitDuration > 0.0 {
            totalCommitDuration = totalCommitDuration + commitDuration
            totalRevealDuration = totalRevealDuration + revealDuration
            roundsWithTiming = roundsWithTiming + 1
        }
    }
    
    let avgCommitDuration = roundsWithTiming > 0 ? totalCommitDuration / UFix64(roundsWithTiming) : 0.0
    let avgRevealDuration = roundsWithTiming > 0 ? totalRevealDuration / UFix64(roundsWithTiming) : 0.0
    
    let stats: {String: AnyStruct} = {
        // Basic game info
        "gameId": gameId,
        "currentRound": currentRound,
        "totalRoundsCompleted": roundResults.length,
        
        // Player statistics
        "originalPlayerCount": totalPlayers,
        "currentPlayerCount": UInt32(remainingPlayers.length),
        "playersEliminated": playersEliminated,
        "eliminationRate": eliminationRate,
        "survivalDifficulty": survivalDifficulty,
        
        // Voting statistics
        "totalVotesCast": totalVotesCast,
        "totalYesVotes": totalVotesYes,
        "totalNoVotes": totalVotesNo,
        "yesVotePercentage": totalVotesCast > 0 ? UFix64(totalVotesYes) / UFix64(totalVotesCast) : 0.0,
        "noVotePercentage": totalVotesCast > 0 ? UFix64(totalVotesNo) / UFix64(totalVotesCast) : 0.0,
        "averageParticipationPerRound": averageParticipationPerRound,
        
        // Round outcome statistics
        "roundsWithYesMinority": roundsWithYesMinority,
        "roundsWithNoMinority": roundsWithNoMinority,
        "yesMinorityPercentage": roundResults.length > 0 ? 
            UFix64(roundsWithYesMinority) / UFix64(roundResults.length) : 0.0,
        
        // Financial statistics
        "entryFee": entryFee,
        "totalFeesCollected": totalFees,
        "platformFeesTotal": platformFees,
        "currentPrizePool": prizePool,
        "netPrizePool": netPrizePool,
        
        // Timing statistics
        "averageCommitDuration": avgCommitDuration,
        "averageRevealDuration": avgRevealDuration,
        "totalGameDuration": totalCommitDuration + totalRevealDuration,
        
        // Engagement metrics
        "playerParticipationRates": playerParticipation,
        "mostActivePlayer": getMostActivePlayer(participation: playerParticipation),
        "gameHealth": getGameHealthScore(
            totalPlayers: totalPlayers,
            remainingPlayers: UInt32(remainingPlayers.length),
            currentRound: currentRound,
            averageParticipation: averageParticipationPerRound
        )
    }
    
    return stats
}

// Helper function to find most active player
access(all) fun getMostActivePlayer(participation: {Address: UInt32}): Address? {
    var maxParticipation: UInt32 = 0
    var mostActivePlayer: Address? = nil
    
    for player in participation.keys {
        let count = participation[player]!
        if count > maxParticipation {
            maxParticipation = count
            mostActivePlayer = player
        }
    }
    
    return mostActivePlayer
}

// Helper function to calculate game health score (0-100)
access(all) fun getGameHealthScore(
    totalPlayers: UInt32,
    remainingPlayers: UInt32,
    currentRound: UInt8,
    averageParticipation: UFix64
): UFix64 {
    // Base score from player retention
    let retentionScore = totalPlayers > 0 ? 
        UFix64(remainingPlayers) / UFix64(totalPlayers) * 40.0 : 0.0
    
    // Score from game progression (more rounds = more engaging)
    let progressionScore = currentRound > 1 ? 
        (UFix64(currentRound - 1) / 10.0) * 30.0 : 0.0
    
    // Score from participation rate
    let participationScore = averageParticipation > 0.0 ? 
        (averageParticipation / UFix64(totalPlayers)) * 30.0 : 0.0
    
    let totalScore = retentionScore + progressionScore + participationScore
    return totalScore > 100.0 ? 100.0 : totalScore
}