export const TEST_CONTRACT_DEPLOYMENT = `
import MinorityRuleGame from 0xb69240f6be3e34ca

access(all) fun main(): {String: AnyStruct} {
    let contractAddress = 0xb69240f6be3e34ca
    let contractAccount = getAccount(contractAddress)
    
    // Check if the contract account exists
    let result: {String: AnyStruct} = {
        "contractAddress": contractAddress.toString(),
        "accountExists": true
    }
    
    // Try to check if the GameManager is saved to storage
    let hasGameManager = contractAccount.capabilities.get<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath).check()
    result["hasGameManagerCapability"] = hasGameManager
    
    // Try to borrow the GameManager
    if let gameManager = contractAccount.capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath) {
        result["gameManagerBorrowSuccess"] = true
        result["gameManagerType"] = gameManager.getType().identifier
    } else {
        result["gameManagerBorrowSuccess"] = false
        result["error"] = "Could not borrow GameManager from public path"
    }
    
    return result
}
`;