import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

transaction(questionText: String, entryFee: UFix64, roundDuration: UFix64, creator: Address) {
    
    let gameManager: &MinorityRuleGame.GameManager
    
    prepare(signer: auth(Storage) &Account) {
        // Borrow the game manager from contract account
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
    }
    
    execute {
        let gameId = self.gameManager.createGame(
            questionText: questionText,
            entryFee: entryFee,
            creator: creator,
            roundDuration: roundDuration
        )
        
        log("Game created with ID: ".concat(gameId.toString()))
    }
}