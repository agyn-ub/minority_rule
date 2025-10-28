import ScheduledRoundHandler from "ScheduledRoundHandler"
import FlowTransactionScheduler from "FlowTransactionScheduler"

// Initialize the ScheduledRoundHandler in storage for a game
// This must be done once per game before scheduling
transaction(gameId: UInt64) {
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, SaveValue, PublishCapability, UnpublishCapability, LoadValue) &Account) {
        
        // Use unique paths for each game
        let handlerPath = StoragePath(identifier: "ScheduledRoundHandler_".concat(gameId.toString()))!
        let publicPath = PublicPath(identifier: "ScheduledRoundHandler_".concat(gameId.toString()))!
        
        // Remove any existing handler for this game
        if signer.storage.borrow<&AnyResource>(from: handlerPath) != nil {
            let oldHandler <- signer.storage.load<@AnyResource>(from: handlerPath)
            destroy oldHandler
            signer.capabilities.unpublish(publicPath)
        }
        
        // Create new handler for the specific game
        let handler <- ScheduledRoundHandler.createHandler(
            gameId: gameId,
            contractAddress: 0x73c003cd6de60fd4  // MinorityRuleGame contract address
        )
        signer.storage.save(<- handler, to: handlerPath)
        
        log("Handler created and saved for game ".concat(gameId.toString()))

        // Issue a capability with correct entitlement for FlowTransactionScheduler
        let _ = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerPath)

        // Issue a non-entitled public capability for the handler that is publicly accessible
        let publicCap = signer.capabilities.storage
            .issue<&{FlowTransactionScheduler.TransactionHandler}>(handlerPath)
        
        // Publish the capability at game-specific path
        signer.capabilities.publish(publicCap, at: publicPath)
        
        log("Handler initialized for game ".concat(gameId.toString()))
    }
}