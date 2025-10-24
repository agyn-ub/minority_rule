import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

access(all) fun main(contractAddress: Address, maxGames: UInt64): [{String: AnyStruct}] {
    // Get the contract account
    let contractAccount = getAccount(contractAddress)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    let games: [{String: AnyStruct}] = []
    
    // Iterate through games up to maxGames
    var gameId: UInt64 = 1
    while gameId <= maxGames {
        if let game = gameManager.borrowGame(gameId: gameId) {
            games.append(game.getGameInfo())
        }
        gameId = gameId + 1
    }
    
    return games
}