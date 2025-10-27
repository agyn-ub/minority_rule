import ProcessRoundHandler from "../contracts/ProcessRoundHandler.cdc"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

// Transaction to schedule round processing using ProcessRoundHandler
transaction(gameId: UInt64, executeAt: UFix64, paymentAmount: UFix64) {
    
    let paymentVault: @{FungibleToken.Vault}
    
    prepare(signer: auth(Storage) &Account) {
        // Get signer's Flow token vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow Flow token vault")
        
        // Withdraw payment for scheduling
        self.paymentVault <- flowVault.withdraw(amount: paymentAmount)
    }
    
    execute {
        // Schedule the round processing
        let txId = ProcessRoundHandler.scheduleNextRound(
            gameId: gameId,
            executeAt: executeAt,
            paymentVault: <- self.paymentVault
        )
        
        log("Scheduled round processing for game "
            .concat(gameId.toString())
            .concat(" with transaction ID: ")
            .concat(txId.toString()))
    }
}