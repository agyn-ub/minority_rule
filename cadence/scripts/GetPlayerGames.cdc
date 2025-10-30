import MinorityRuleGame from "MinorityRuleGame"

// Note: In the event-based architecture, player participation is tracked via events, not stored state
// To get player games, query the blockchain events:
// flow events get A.CONTRACT_ADDRESS.MinorityRuleGame.PlayerJoined --filter player=PLAYER_ADDRESS
access(all) fun main(player: Address): {String: String} {
    return {
        "note": "Player games are tracked via events, not stored on-chain",
        "howToQuery": "Use Flow CLI: flow events get A.CONTRACT_ADDRESS.MinorityRuleGame.PlayerJoined",
        "filterBy": "Filter results by player address",
        "player": player.toString()
    }
}