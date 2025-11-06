import MinorityRuleGame from "MinorityRuleGame"

// Get historical round data and results for analysis
access(all) fun main(gameId: UInt64): {String: AnyStruct} {
    
    // Get the contract account
    let contractAccount = getAccount(MinorityRuleGame.address)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the game
    let game = gameManager.borrowGame(gameId: gameId)
        ?? panic("Game not found")
    
    // Get game info
    let gameInfo = game.getGameInfo()
    let currentRound = gameInfo["currentRound"] as! UInt8
    let roundResults = gameInfo["roundResults"] as! {UInt8: Bool}
    let playerVoteHistory = gameInfo["playerVoteHistory"] as! {Address: [MinorityRuleGame.VoteRecord]}
    let totalPlayers = gameInfo["totalPlayers"] as! UInt32
    let remainingPlayers = gameInfo["remainingPlayers"] as! [Address]
    
    // Analyze each completed round
    var roundAnalysis: [{String: AnyStruct}] = []
    
    for round in roundResults.keys {
        let minorityVote = roundResults[round]!
        
        // Count votes for this round
        var yesVotes: UInt32 = 0
        var noVotes: UInt32 = 0
        var participatingPlayers: [Address] = []
        var survivingPlayers: [Address] = []
        
        for player in playerVoteHistory.keys {
            let voteHistory = playerVoteHistory[player]!
            
            // Find vote for this round
            for voteRecord in voteHistory {
                if voteRecord.round == round {
                    participatingPlayers.append(player)
                    
                    if voteRecord.vote {
                        yesVotes = yesVotes + 1
                    } else {
                        noVotes = noVotes + 1
                    }
                    
                    // Check if player survived (voted minority)
                    if voteRecord.vote == minorityVote {
                        survivingPlayers.append(player)
                    }
                    break
                }
            }
        }
        
        // Get round timing info
        let timingInfo = game.getRoundTimings(round: round)
        
        let roundData: {String: AnyStruct} = {
            "round": round,
            "minorityVote": minorityVote,
            "minorityAnswer": minorityVote ? "YES" : "NO",
            "yesVotes": yesVotes,
            "noVotes": noVotes,
            "totalVotes": yesVotes + noVotes,
            "participatingPlayers": participatingPlayers,
            "survivingPlayers": survivingPlayers,
            "eliminatedCount": participatingPlayers.length - survivingPlayers.length,
            "survivalRate": participatingPlayers.length > 0 ? 
                UFix64(survivingPlayers.length) / UFix64(participatingPlayers.length) : 0.0,
            "commitDuration": timingInfo["commitDuration"]!,
            "revealDuration": timingInfo["revealDuration"]!
        }
        
        roundAnalysis.append(roundData)
    }
    
    // Sort rounds by round number
    // Note: Cadence doesn't have built-in sorting, so we'll return unsorted
    // Frontend can sort this data
    
    let historyData: {String: AnyStruct} = {
        "gameId": gameId,
        "currentRound": currentRound,
        "totalRoundsCompleted": roundResults.length,
        "originalPlayerCount": totalPlayers,
        "currentPlayerCount": UInt32(remainingPlayers.length),
        "eliminationRate": totalPlayers > 0 ? 
            UFix64(totalPlayers - UInt32(remainingPlayers.length)) / UFix64(totalPlayers) : 0.0,
        "rounds": roundAnalysis,
        "gameStatus": remainingPlayers.length <= 2 ? "Completed" : "Ongoing"
    }
    
    return historyData
}