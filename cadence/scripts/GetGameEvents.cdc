import MinorityRuleGame from "MinorityRuleGame"

// This script demonstrates how to query game events
// In production, you would use Flow SDK to query events from blockchain history
access(all) fun main(gameId: UInt64): {String: AnyStruct} {
    
    // Note: This script shows game state, not events
    // To get events, use Flow SDK:
    // 
    // const events = await fcl.query({
    //   cadence: `
    //     pub fun main(gameId: UInt64): [AnyStruct] {
    //       return getEventsForHeightRange(
    //         type: "MinorityRuleGame.VoteSubmitted",
    //         startHeight: 0,
    //         endHeight: getCurrentBlock().height
    //       ).filter(e => e.data.gameId == gameId)
    //     }
    //   `
    // })
    
    // For now, return current game state
    // Get the contract address (replace with actual deployed address)
    let contractAddress = Address(0x01) // TODO: Replace with actual contract address
    
    let gameManager = getAccount(contractAddress)
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public capability")
    
    if let game = gameManager.borrowGame(gameId: gameId) {
        let info = game.getGameInfo()
        
        // Add event query instructions
        info["eventQueryNote"] = "Use Flow SDK or CLI to query events: flow events get A.CONTRACT_ADDRESS.MinorityRuleGame.VoteSubmitted"
        info["exampleQuery"] = "flow events get A.f8d6e0586b0a20c7.MinorityRuleGame.VoteSubmitted --start-height 1000 --end-height 2000"
        
        return info
    }
    
    return {"error": "Game not found"}
}