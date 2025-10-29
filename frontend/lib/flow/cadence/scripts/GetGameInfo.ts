export const GET_GAME_INFO = `
import MinorityRuleGame from 0xMinorityRuleGame

access(all) fun main(gameId: UInt64, contractAddress: Address): {String: AnyStruct}? {
    // Get the contract account
    let contractAccount = getAccount(contractAddress)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the game
    if let game = gameManager.borrowGame(gameId: gameId) {
        return game.getGameInfo()
    }
    
    return nil
}
`;