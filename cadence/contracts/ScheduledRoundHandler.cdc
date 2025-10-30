import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"
import MinorityRuleGame from "MinorityRuleGame"
import FlowTransactionScheduler from "FlowTransactionScheduler"

// Handler contract for Forte scheduled round processing
access(all) contract ScheduledRoundHandler {

    // Events
    access(all) event HandlerCreated(gameId: UInt64)
    access(all) event RoundProcessedByScheduler(gameId: UInt64, round: UInt8)
    access(all) event SchedulerInitialized()

    // Storage paths
    access(all) let HandlerStoragePath: StoragePath
    access(all) let HandlerPublicPath: PublicPath

    // Transaction Handler resource for scheduled execution
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        
        access(all) let gameId: UInt64
        access(all) let contractAddress: Address
        
        init(gameId: UInt64, contractAddress: Address) {
            self.gameId = gameId
            self.contractAddress = contractAddress
        }

        // Execute the scheduled transaction
        access(FlowTransactionScheduler.Execute) 
        fun executeTransaction(id: UInt64, data: AnyStruct?) {
            // Get the game manager
            let gameManager = getAccount(self.contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow GameManagerPublic")
            
            // Get the game
            let game = gameManager.borrowGame(gameId: self.gameId)
                ?? panic("Game not found")
            
            // Store current round before processing
            let currentRound = game.currentRound
            
            // Process the round
            game.processRound()
            
            emit RoundProcessedByScheduler(gameId: self.gameId, round: currentRound)
            
            // Log the result
            if game.state == MinorityRuleGame.GameState.commitPhase {
                log("Round processed, game continues to round ".concat(game.currentRound.toString()))
            } else {
                log("Game ".concat(self.gameId.toString()).concat(" completed"))
            }
        }

        // Required view methods for FlowTransactionScheduler interface
        access(all) view fun getViews(): [Type] {
            return [Type<StoragePath>(), Type<PublicPath>()]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<StoragePath>():
                    return /storage/ScheduledRoundHandler
                case Type<PublicPath>():
                    return /public/ScheduledRoundHandler
                default:
                    return nil
            }
        }
    }

    // Create a new handler for a specific game
    access(all) fun createHandler(gameId: UInt64, contractAddress: Address): @Handler {
        let handler <- create Handler(gameId: gameId, contractAddress: contractAddress)
        emit HandlerCreated(gameId: gameId)
        return <- handler
    }

    init() {
        self.HandlerStoragePath = /storage/ScheduledRoundHandler
        self.HandlerPublicPath = /public/ScheduledRoundHandler
        
        emit SchedulerInitialized()
    }
}