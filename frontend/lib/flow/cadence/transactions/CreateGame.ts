export const CREATE_GAME = `
import MinorityRuleGame from 0xb69240f6be3e34ca
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

transaction(questionText: String, entryFee: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let gameId: UInt64
    let creator: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.creator = signer.address
        
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(0xb69240f6be3e34ca)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Create the game
        self.gameId = self.gameManager.createGame(
            questionText: questionText,
            entryFee: entryFee,
            creator: self.creator
        )
    }
    
    execute {
        log("Game created with ID: ".concat(self.gameId.toString()))
        log("Creator: ".concat(self.creator.toString()))
        log("Game state: commitPhase - Ready for players to join and commit")
        log("Next step: Set commit and reveal deadlines")
    }
}
`;