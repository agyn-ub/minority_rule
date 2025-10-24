import FlowTransactionScheduler from "FlowTransactionScheduler"
import MinorityRuleGame from "./MinorityRuleGame.cdc"

access(all) contract MinorityGameTransactionHandler {

    access(all) let HandlerStoragePath: StoragePath
    access(all) let HandlerPublicPath: PublicPath

    // Event emitted when a round is automatically processed
    access(all) event RoundAutoProcessed(gameId: UInt64, roundNumber: UInt8, timestamp: UFix64)

    // Transaction Handler resource for processing rounds
    access(all) resource RoundProcessorHandler: FlowTransactionScheduler.TransactionHandler {
        
        access(all) let gameId: UInt64
        access(all) let roundNumber: UInt8
        
        init(gameId: UInt64, roundNumber: UInt8) {
            self.gameId = gameId
            self.roundNumber = roundNumber
        }

        access(FlowTransactionScheduler.Execute) fun execute() {
            // Get the game manager
            let gameManager = MinorityRuleGame.getAccount()
                .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
                ?? panic("Could not borrow game manager")
            
            // Get the game
            let game = gameManager.borrowGame(gameId: self.gameId)
                ?? panic("Game not found")
            
            // Process the round
            game.processRound()
            
            emit RoundAutoProcessed(
                gameId: self.gameId, 
                roundNumber: self.roundNumber, 
                timestamp: getCurrentBlock().timestamp
            )
            
            // If game is still active and not completed, schedule next round processing
            if game.state == MinorityRuleGame.GameState.votingOpen {
                self.scheduleNextRound(game: game)
            }
        }
        
        access(self) fun scheduleNextRound(game: &MinorityRuleGame.Game) {
            // Create a new handler for the next round
            let nextHandler <- create RoundProcessorHandler(
                gameId: self.gameId, 
                roundNumber: game.currentRound
            )
            
            // Calculate execution effort (simplified)
            let executionEffort: UInt64 = 1000
            
            // Schedule the next round processing
            FlowTransactionScheduler.schedule(
                timestamp: game.roundDeadline,
                priority: FlowTransactionScheduler.Priority.Medium,
                executionEffort: executionEffort,
                transactionHandler: <- nextHandler,
                publicPath: MinorityGameTransactionHandler.HandlerPublicPath
            )
        }
    }

    // Factory to create round processor handlers
    access(all) resource HandlerFactory {
        
        access(all) fun createRoundProcessor(gameId: UInt64, roundNumber: UInt8): @RoundProcessorHandler {
            return <- create RoundProcessorHandler(gameId: gameId, roundNumber: roundNumber)
        }
    }

    // Create a new handler factory
    access(all) fun createHandlerFactory(): @HandlerFactory {
        return <- create HandlerFactory()
    }

    // Schedule round processing for a game
    access(all) fun scheduleRoundProcessing(gameId: UInt64, roundNumber: UInt8, deadline: UFix64) {
        // Create handler for this round
        let handler <- create RoundProcessorHandler(gameId: gameId, roundNumber: roundNumber)
        
        // Calculate execution effort
        let executionEffort: UInt64 = 1000
        
        // Schedule the transaction
        FlowTransactionScheduler.schedule(
            timestamp: deadline,
            priority: FlowTransactionScheduler.Priority.Medium,
            executionEffort: executionEffort,
            transactionHandler: <- handler,
            publicPath: self.HandlerPublicPath
        )
    }

    init() {
        self.HandlerStoragePath = /storage/MinorityGameHandlerFactory
        self.HandlerPublicPath = /public/MinorityGameHandlerFactory
        
        // Save handler factory to contract account
        self.account.storage.save(<- create HandlerFactory(), to: self.HandlerStoragePath)
    }
}