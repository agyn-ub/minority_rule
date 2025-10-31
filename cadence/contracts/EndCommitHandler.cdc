import "FlowTransactionScheduler"
import "MinorityRuleGame"

access(all) contract EndCommitHandler {

    /// Handler resource that implements the Scheduled Transaction interface
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        access(all) let gameId: UInt64
        access(all) let contractAddress: Address
        
        init(gameId: UInt64, contractAddress: Address) {
            self.gameId = gameId
            self.contractAddress = contractAddress
        }
        
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            // Get the game manager
            let gameManager = getAccount(self.contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow GameManagerPublic")
            
            // Get the game
            let game = gameManager.borrowGame(gameId: self.gameId)
                ?? panic("Game not found")
            
            // Start reveal phase
            game.startRevealPhase()
            
            log("Transaction executed - Start reveal phase for game ".concat(self.gameId.toString()))
        }

        access(all) view fun getViews(): [Type] {
            return [Type<StoragePath>(), Type<PublicPath>()]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<StoragePath>():
                    return /storage/EndCommitHandler
                case Type<PublicPath>():
                    return /public/EndCommitHandler
                default:
                    return nil
            }
        }
    }

    /// Factory for the handler resource
    access(all) fun createHandler(gameId: UInt64, contractAddress: Address): @Handler {
        return <- create Handler(gameId: gameId, contractAddress: contractAddress)
    }
}
