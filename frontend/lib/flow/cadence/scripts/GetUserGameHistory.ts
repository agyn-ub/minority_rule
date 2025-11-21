export const GET_USER_GAME_HISTORY = `
import MinorityRuleGame from 0xMinorityRuleGame

// Get the list of game IDs that a user has participated in
access(all) fun main(userAddress: Address): [UInt64] {
    
    // Get the contract account
    let contractAccount = getAccount(0xMinorityRuleGame)
    
    // Borrow the game manager from public path
    let gameManager = contractAccount
        .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
        ?? panic("Could not borrow game manager from public path")
    
    // Get the user's game history
    return gameManager.getUserGameHistory(player: userAddress)
}
`;