import FlowTransactionScheduler from "FlowTransactionScheduler"
import FlowTransactionSchedulerUtils from "FlowTransactionSchedulerUtils"
import FlowToken from "FlowToken"
import FungibleToken from "FungibleToken"

// Schedule automatic round processing using Forte scheduled transactions
// Note: Must run InitScheduledRoundHandler first to set up the handler
transaction(
    gameId: UInt64,
    delaySeconds: UFix64,
    priority: UInt8,  // 0=High, 1=Medium, 2=Low
    executionEffort: UInt64
) {
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, SaveValue, GetStorageCapabilityController, PublishCapability) &Account) {
        
        let future = getCurrentBlock().timestamp + delaySeconds
        
        // Convert priority integer to enum
        let pr = priority == 0
            ? FlowTransactionScheduler.Priority.High
            : priority == 1
                ? FlowTransactionScheduler.Priority.Medium
                : FlowTransactionScheduler.Priority.Low
        
        // Use game-specific handler path
        let handlerPath = StoragePath(identifier: "ScheduledRoundHandler_".concat(gameId.toString()))!
        
        // Get the entitled capability that will be used to create the transaction
        var handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>? = nil
        let controllers = signer.capabilities.storage.getControllers(forPath: handlerPath)
        
        for controller in controllers {
            if let cap = controller.capability as? Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}> {
                handlerCap = cap
                break
            }
        }
        
        if handlerCap == nil {
            panic("Could not find handler capability for game ".concat(gameId.toString()).concat(". Please run InitScheduledRoundHandler first."))
        }
        
        // Save a manager resource to storage if not already present
        if signer.storage.borrow<&AnyResource>(from: FlowTransactionSchedulerUtils.managerStoragePath) == nil {
            let manager <- FlowTransactionSchedulerUtils.createManager()
            signer.storage.save(<- manager, to: FlowTransactionSchedulerUtils.managerStoragePath)
            
            // Create a capability for the Manager
            let managerCapPublic = signer.capabilities.storage.issue<&{FlowTransactionSchedulerUtils.Manager}>(
                FlowTransactionSchedulerUtils.managerStoragePath
            )
            signer.capabilities.publish(managerCapPublic, at: FlowTransactionSchedulerUtils.managerPublicPath)
        }
        
        // Borrow the manager with Owner authorization
        let manager = signer.storage.borrow<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>(
            from: FlowTransactionSchedulerUtils.managerStoragePath
        ) ?? panic("Could not borrow a Manager reference")
        
        // Withdraw fees
        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Missing FlowToken vault")
        
        // Estimate the cost
        let transactionData: AnyStruct? = nil  // No additional data needed
        let est = FlowTransactionScheduler.estimate(
            data: transactionData,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort
        )
        
        assert(
            est.timestamp != nil || pr == FlowTransactionScheduler.Priority.Low,
            message: est.error ?? "Estimation failed"
        )
        
        let fees <- vaultRef.withdraw(amount: est.flowFee ?? 0.0) as! @FlowToken.Vault
        
        // Schedule through the manager
        let transactionId = manager.schedule(
            handlerCap: handlerCap!,
            data: transactionData,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort,
            fees: <- fees
        )
        
        log("Scheduled round processing for game "
            .concat(gameId.toString())
            .concat(" at timestamp ")
            .concat(future.toString())
            .concat(" with transaction ID ")
            .concat(transactionId.toString()))
        
        log("The round will be processed automatically by Forte scheduled transactions!")
    }
}