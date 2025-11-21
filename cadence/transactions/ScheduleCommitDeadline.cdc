import "FungibleToken"
import "FlowToken"
import "FlowTransactionScheduler"
import "EndCommitHandler"
import "MinorityRuleGame"

transaction(gameId: UInt64, delaySeconds: UFix64, contractAddress: Address) {
    
    let signer: auth(Storage, Capabilities) &Account
    let contractAddress: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.signer = signer
        self.contractAddress = 0xf63159eb10f911cd  // TODO: Replace with actual contract address
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
                .concat(") can schedule commit deadlines. Caller: ").concat(self.signer.address.toString()))
        }
        
        // Create handler for this specific game
        let handler <- EndCommitHandler.createHandler(gameId: gameId, contractAddress: self.contractAddress)
        
        // Store handler in signer's storage with unique path per game
        let handlerStoragePath = StoragePath(identifier: "EndCommitHandler_".concat(gameId.toString()))!
        self.signer.storage.save(<-handler, to: handlerStoragePath)
        
        // Issue capability for scheduled execution
        let handlerCap = self.signer.capabilities.storage.issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)
        
        // Calculate execution timestamp (current time + delay)
        let timestamp = getCurrentBlock().timestamp + delaySeconds
        
        // Set scheduling parameters
        let priority = FlowTransactionScheduler.Priority(rawValue: 1)!  // Medium priority
        let executionEffort: UInt64 = 300
        let transactionData: AnyStruct? = nil
        
        // For now, use a reasonable fee estimate (0.1 FLOW)
        // TODO: Use FlowTransactionScheduler.estimate() when API is stable
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
        
        log("Scheduled EndCommitHandler for game ".concat(gameId.toString()))
        log("Transaction ID: ".concat(receipt.id.toString()))
        log("Execution timestamp: ".concat(timestamp.toString()))
        log("Will end commit phase and start reveal phase")
        
        // Store receipt for potential future cancellation
        // For now, just destroy it as we don't need to cancel
        destroy receipt
    }
}