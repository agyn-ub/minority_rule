import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

// Check if a player has a voting token and its status
access(all) fun main(playerAddress: Address): {String: AnyStruct}? {
    let account = getAccount(playerAddress)
    
    // Try to borrow the voting token from player's storage
    let tokenCap = account.capabilities.borrow<&MinorityRuleGame.VotingToken>(
        MinorityRuleGame.VotingTokenPublicPath
    )
    
    if let token = tokenCap {
        return {
            "gameId": token.gameId,
            "lastVotedRound": token.lastVotedRound,
            "isEliminated": token.isEliminated,
            "votesCount": token.voteHistory.length
        }
    }
    
    return nil
}