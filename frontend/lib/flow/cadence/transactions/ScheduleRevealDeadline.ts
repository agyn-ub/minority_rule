export const SCHEDULE_REVEAL_DEADLINE = `
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868
import FlowTransactionScheduler from 0x8c5303eaa26202d6
import EndRevealHandler from "EndRevealHandler"
import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, delaySeconds: UFix64) {
    
    let signer: auth(Storage, Capabilities) &Account
    let contractAddress: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.signer = signer
        self.contractAddress = MinorityRuleGame.address
    }
    
    execute {
        // Get the game manager to verify creator authorization
        let gameManager = getAccount(self.contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        let game = gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Verify only the game creator can schedule deadlines
        if self.signer.address != game.creator {
            panic("Access denied: Only the game creator (".concat(game.creator.toString())
                .concat(") can schedule reveal deadlines. Caller: ").concat(self.signer.address.toString()))
        }
        
        // Create handler for this specific game
        let handler <- EndRevealHandler.createHandler(gameId: gameId, contractAddress: self.contractAddress)
        
        // Store handler in signer's storage with unique path per game
        let handlerStoragePath = StoragePath(identifier: "EndRevealHandler_".concat(gameId.toString()))!
        self.signer.storage.save(<-handler, to: handlerStoragePath)
        
        // Issue capability for scheduled execution
        let handlerCap = self.signer.capabilities.storage.issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)
        
        // Calculate execution timestamp (current time + delay)
        let timestamp = getCurrentBlock().timestamp + delaySeconds
        
        // Set scheduling parameters
        let priority = FlowTransactionScheduler.Priority(rawValue: 1)!  // Medium priority
        let executionEffort: UInt64 = 300
        let transactionData: AnyStruct? = nil
        
        // Use fixed fee estimate (0.1 FLOW)
        let estimatedFees: UFix64 = 0.1
        
        // Withdraw fees from signer's FlowToken vault
        let vault = self.signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken Vault")
        
        let feePayment <- vault.withdraw(amount: estimatedFees) as! @FlowToken.Vault
        
        // Schedule the transaction
        let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: handlerCap,
            data: transactionData,
            timestamp: timestamp,
            priority: priority,
            executionEffort: executionEffort,
            fees: <-feePayment
        )
        
        log("Scheduled EndRevealHandler for game ".concat(gameId.toString()))
        log("Transaction ID: ".concat(receipt.id.toString()))
        log("Execution timestamp: ".concat(timestamp.toString()))
        log("Will end reveal phase and process round")
        
        // Store receipt for potential future cancellation
        destroy receipt
    }
}
`;