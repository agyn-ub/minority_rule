import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"
// ProcessRoundHandler will be used via account reference

access(all) contract MinorityRuleGame {

    // Events - Full game history stored here
    access(all) event GameCreated(gameId: UInt64, entryFee: UFix64, creator: Address, questionText: String)
    access(all) event PlayerJoined(gameId: UInt64, player: Address, amount: UFix64, totalPlayers: UInt32)
    access(all) event GameStarted(gameId: UInt64, totalPlayers: UInt32)
    access(all) event VoteSubmitted(gameId: UInt64, round: UInt8, player: Address, vote: Bool)
    access(all) event RoundCompleted(gameId: UInt64, round: UInt8, yesCount: UInt32, noCount: UInt32, minorityVote: Bool, votesRemaining: UInt32)
    access(all) event GameCompleted(gameId: UInt64, totalRounds: UInt8, finalPrize: UFix64, platformFee: UFix64)
    access(all) event PrizeDistributed(gameId: UInt64, winner: Address, amount: UFix64)

    // Contract state
    access(all) var nextGameId: UInt64
    access(all) var totalFeePercentage: UFix64  // Total fee (3%)
    access(all) var platformFeePercentage: UFix64  // Fee for platform recipient (2%)
    access(all) var storageFeePercentage: UFix64  // Fee kept in contract (1%)
    access(all) let platformFeeRecipient: Address
    access(self) var contractStorageVault: @{FungibleToken.Vault}  // Vault for storage fees
    
    // Storage paths
    access(all) let GameStoragePath: StoragePath
    access(all) let GamePublicPath: PublicPath
    access(all) let VotingTokenStoragePath: StoragePath
    access(all) let VotingTokenPublicPath: PublicPath

    // Game states
    access(all) enum GameState: UInt8 {
        access(all) case votingOpen
        access(all) case processingRound
        access(all) case completed
    }

    // Player vote record
    access(all) struct VoteRecord {
        access(all) let round: UInt8
        access(all) let vote: Bool
        access(all) let timestamp: UFix64
        
        init(round: UInt8, vote: Bool) {
            self.round = round
            self.vote = vote
            self.timestamp = getCurrentBlock().timestamp
        }
    }

    // Ultra-efficient Game resource - minimal storage
    access(all) resource Game {
        access(all) let gameId: UInt64
        access(all) let questionText: String
        access(all) let entryFee: UFix64
        access(all) let creator: Address
        access(all) let roundDuration: UFix64
        
        // State tracking
        access(all) var state: GameState
        access(all) var currentRound: UInt8
        access(all) var roundDeadline: UFix64
        access(all) var totalPlayers: UInt32
        
        // Store all players (contract pays for storage)
        access(all) var players: [Address]
        access(all) var playerVoteHistory: {Address: [VoteRecord]}
        
        // Current round tracking
        access(all) var currentRoundYesVotes: UInt32
        access(all) var currentRoundNoVotes: UInt32
        access(all) var currentRoundTotalVotes: UInt32
        access(all) var currentRoundVoters: {Address: Bool}
        
        // Round results - which answer was minority
        access(all) var roundResults: {UInt8: Bool}
        
        // Players remaining after each round
        access(all) var remainingPlayers: [Address]
        
        // Prize vault
        access(all) var prizeVault: @{FungibleToken.Vault}
        
        // Scheduling funds (creator deposits 1 FLOW)
        access(all) var schedulingVault: @{FungibleToken.Vault}
        access(all) let processingFeePerRound: UFix64
        access(all) var nextScheduledTxId: UInt64?
        
        // Winners - populated at game end
        access(all) var winners: [Address]
        
        init(
            questionText: String,
            entryFee: UFix64,
            creator: Address,
            roundDuration: UFix64
        ) {
            self.gameId = MinorityRuleGame.nextGameId
            MinorityRuleGame.nextGameId = MinorityRuleGame.nextGameId + 1
            
            self.questionText = questionText
            self.entryFee = entryFee
            self.creator = creator
            self.roundDuration = roundDuration
            
            // Start immediately in Round 1
            self.state = GameState.votingOpen
            self.currentRound = 1
            self.roundDeadline = getCurrentBlock().timestamp + roundDuration
            self.totalPlayers = 0
            
            self.players = []
            self.playerVoteHistory = {}
            
            self.currentRoundYesVotes = 0
            self.currentRoundNoVotes = 0
            self.currentRoundTotalVotes = 0
            self.currentRoundVoters = {}
            
            self.roundResults = {}
            self.remainingPlayers = []
            self.winners = []
            
            self.schedulingVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
            self.processingFeePerRound = 0.01  // 0.01 FLOW per round
            self.nextScheduledTxId = nil
            
            self.prizeVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
            
            emit GameCreated(
                gameId: self.gameId,
                entryFee: self.entryFee,
                creator: self.creator,
                questionText: self.questionText
            )
        }
        
        // Player joins the game (creator must also provide scheduling fund)
        access(all) fun joinGame(player: Address, payment: @{FungibleToken.Vault}, schedulingFund: @{FungibleToken.Vault}?) {
            pre {
                self.currentRound == 1: "Can only join during Round 1"
                self.state == GameState.votingOpen: "Game is not accepting new players"
                payment.balance == self.entryFee: "Incorrect entry fee amount"
                !self.players.contains(player): "Player already joined"
            }
            
            // If this is the creator (first player) and scheduling fund provided
            if self.totalPlayers == 0 && schedulingFund != nil {
                let fund <- schedulingFund!
                assert(fund.balance >= 1.0, message: "Scheduling fund must be at least 1 FLOW")
                self.schedulingVault.deposit(from: <- fund)
            } else if schedulingFund != nil {
                // Non-creator shouldn't provide scheduling fund
                destroy schedulingFund!
                panic("Only game creator provides scheduling fund")
            } else {
                // Destroy nil optional
                destroy schedulingFund
            }
            
            self.prizeVault.deposit(from: <- payment)
            self.totalPlayers = self.totalPlayers + 1
            
            // Store player in array
            self.players.append(player)
            self.playerVoteHistory[player] = []
            
            emit PlayerJoined(
                gameId: self.gameId, 
                player: player, 
                amount: self.entryFee,
                totalPlayers: self.totalPlayers
            )
            
            // Initialize game when first player (creator) joins
            self.initializeGameIfNeeded()
            
            // Update vote count for Round 1
            // In Round 1, all players who join can vote
            if self.currentRound == 1 {
                self.currentRoundTotalVotes = self.totalPlayers
                // Add new player to remainingPlayers for Round 1
                if !self.remainingPlayers.contains(player) {
                    self.remainingPlayers.append(player)
                }
            }
        }
        
        // Initialize game after first player joins
        access(self) fun initializeGameIfNeeded() {
            // Only initialize once when first player joins
            if self.totalPlayers == 1 {
                self.currentRoundTotalVotes = self.totalPlayers
                
                // Initialize remaining players with all players
                self.remainingPlayers = self.players
                
                emit GameStarted(gameId: self.gameId, totalPlayers: self.totalPlayers)
                
                // Schedule the first round processing
                if self.schedulingVault.balance >= self.processingFeePerRound {
                    // For now, simulate scheduling (FlowTransactionScheduler integration coming)
                    self.nextScheduledTxId = UInt64(getCurrentBlock().height)
                    
                    // Deduct scheduling fee
                    let fee <- self.schedulingVault.withdraw(amount: self.processingFeePerRound)
                    MinorityRuleGame.contractStorageVault.deposit(from: <- fee)
                    
                    log("First round processing scheduled for game ".concat(self.gameId.toString()))
                } else {
                    log("Warning: Insufficient scheduling funds for automatic processing")
                }
            }
        }
        
        // Submit vote
        access(all) fun submitVote(player: Address, vote: Bool) {
            pre {
                self.state == GameState.votingOpen: "Voting is not open"
                // Round 1: All players who joined can vote
                // Round 2+: Only remaining players from previous round can vote
                (self.currentRound == 1 && self.players.contains(player)) || 
                    (self.currentRound > 1 && self.remainingPlayers.contains(player)): 
                    "Player not eligible to vote in current round"
                self.currentRoundVoters[player] == nil: "Already voted this round"
                getCurrentBlock().timestamp <= self.roundDeadline: "Round deadline has passed"
            }
            
            // Backup trigger: Check if previous round needs processing
            // This should actually be done before voting, in a separate function
            // For now, we'll keep preconditions clean
            
            // Update vote counts
            if vote {
                self.currentRoundYesVotes = self.currentRoundYesVotes + 1
            } else {
                self.currentRoundNoVotes = self.currentRoundNoVotes + 1
            }
            
            // Mark as voted
            self.currentRoundVoters[player] = true
            
            // Store vote in history
            let voteRecord = VoteRecord(round: self.currentRound, vote: vote)
            if let history = self.playerVoteHistory[player] {
                history.append(voteRecord)
                self.playerVoteHistory[player] = history
            }
            
            emit VoteSubmitted(
                gameId: self.gameId,
                round: self.currentRound,
                player: player,
                vote: vote
            )
            
            // Round will be processed by scheduled transaction after deadline
        }
        
        // Process the current round
        access(all) fun processRound() {
            pre {
                self.state == GameState.votingOpen: "Game not in voting state"
                getCurrentBlock().timestamp > self.roundDeadline || 
                    (self.currentRoundYesVotes + self.currentRoundNoVotes) >= self.currentRoundTotalVotes: 
                    "Round not ready to process"
            }
            
            self.state = GameState.processingRound
            
            // Determine minority vote
            let minorityVote: Bool = self.currentRoundYesVotes <= self.currentRoundNoVotes
            let votesRemaining: UInt32 = minorityVote ? self.currentRoundYesVotes : self.currentRoundNoVotes
            
            // Store round result
            self.roundResults[self.currentRound] = minorityVote
            
            emit RoundCompleted(
                gameId: self.gameId,
                round: self.currentRound,
                yesCount: self.currentRoundYesVotes,
                noCount: self.currentRoundNoVotes,
                minorityVote: minorityVote,
                votesRemaining: votesRemaining
            )
            
            // Update remaining players - only those who voted minority continue
            let newRemainingPlayers: [Address] = []
            // Round 1: Check all players who joined
            // Round 2+: Check only remaining players from previous round
            let playersToCheck = self.currentRound == 1 ? self.players : self.remainingPlayers
            
            for player in playersToCheck {
                if let history = self.playerVoteHistory[player] {
                    // Check if player voted and if their vote was minority
                    if history.length > 0 {
                        let lastVote = history[history.length - 1]
                        if lastVote.round == self.currentRound && lastVote.vote == minorityVote {
                            newRemainingPlayers.append(player)
                        }
                    }
                }
            }
            self.remainingPlayers = newRemainingPlayers
            
            // Check if game should end
            if votesRemaining <= 2 || votesRemaining == 0 {
                self.winners = self.remainingPlayers
                self.endGame()
            } else {
                // Start next round
                self.currentRound = self.currentRound + 1
                self.currentRoundYesVotes = 0
                self.currentRoundNoVotes = 0
                self.currentRoundTotalVotes = votesRemaining
                self.currentRoundVoters = {}
                self.roundDeadline = getCurrentBlock().timestamp + self.roundDuration
                self.state = GameState.votingOpen
                
                // Schedule next round processing if funds available
                if self.schedulingVault.balance >= self.processingFeePerRound {
                    // For now, simulate scheduling (FlowTransactionScheduler integration coming)
                    self.nextScheduledTxId = UInt64(getCurrentBlock().height)
                    
                    // Deduct scheduling fee from vault
                    let fee <- self.schedulingVault.withdraw(amount: self.processingFeePerRound)
                    MinorityRuleGame.contractStorageVault.deposit(from: <- fee)
                    
                    log("Next round scheduled for game ".concat(self.gameId.toString()))
                } else {
                    log("Warning: Insufficient scheduling funds for next round")
                }
            }
        }
        
        // End the game and distribute prizes
        access(self) fun endGame() {
            self.state = GameState.completed
            
            // Calculate fees
            let totalPrize = self.prizeVault.balance
            let platformFee = totalPrize * MinorityRuleGame.platformFeePercentage  // 2% for recipient
            let storageFee = totalPrize * MinorityRuleGame.storageFeePercentage   // 1% for contract storage
            
            // Send platform fee to recipient (2%)
            if platformFee > 0.0 {
                let platformFeeVault <- self.prizeVault.withdraw(amount: platformFee)
                let recipientVault = getAccount(MinorityRuleGame.platformFeeRecipient)
                    .capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
                    ?? panic("Could not borrow platform fee recipient vault")
                recipientVault.deposit(from: <- platformFeeVault)
            }
            
            // Keep storage fee in contract (1%)
            if storageFee > 0.0 {
                let storageFeeVault <- self.prizeVault.withdraw(amount: storageFee)
                MinorityRuleGame.contractStorageVault.deposit(from: <- storageFeeVault)
            }
            
            // Distribute prizes to winners
            let remainingPrize = self.prizeVault.balance
            if self.winners.length > 0 {
                let prizePerWinner = remainingPrize / UFix64(self.winners.length)
                
                for winner in self.winners {
                    // Get winner's Flow vault capability
                    let winnerVault = getAccount(winner)
                        .capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
                    
                    if winnerVault != nil {
                        // Send prize to winner
                        let winnerPrize <- self.prizeVault.withdraw(amount: prizePerWinner)
                        winnerVault!.deposit(from: <- winnerPrize)
                        
                        emit PrizeDistributed(
                            gameId: self.gameId,
                            winner: winner,
                            amount: prizePerWinner
                        )
                    } else {
                        // If winner doesn't have a vault, log it (they can still claim later if needed)
                        log("Warning: Winner ".concat(winner.toString()).concat(" doesn't have a Flow vault"))
                    }
                }
            }
            
            emit GameCompleted(
                gameId: self.gameId,
                totalRounds: self.currentRound,
                finalPrize: remainingPrize,
                platformFee: platformFee + storageFee  // Total fees taken
            )
        }
        
        // Get game info
        access(all) fun getGameInfo(): {String: AnyStruct} {
            return {
                "gameId": self.gameId,
                "questionText": self.questionText,
                "entryFee": self.entryFee,
                "creator": self.creator,
                "state": self.state.rawValue,
                "currentRound": self.currentRound,
                "roundDuration": self.roundDuration,
                "roundDeadline": self.roundDeadline,
                "totalPlayers": self.totalPlayers,
                "currentYesVotes": self.currentRoundYesVotes,
                "currentNoVotes": self.currentRoundNoVotes,
                "prizePool": self.prizeVault.balance,
                "players": self.players,
                "remainingPlayers": self.remainingPlayers,
                "winners": self.winners,
                "roundResults": self.roundResults,
                "prizesDistributed": self.state == GameState.completed
            }
        }
    }
    
    // Public interface for GameManager
    access(all) resource interface GameManagerPublic {
        access(all) fun borrowGame(gameId: UInt64): &Game?
        access(all) fun createGame(
            questionText: String,
            entryFee: UFix64,
            creator: Address,
            roundDuration: UFix64
        ): UInt64
    }
    
    // Game Manager resource
    access(all) resource GameManager: GameManagerPublic {
        access(all) var games: @{UInt64: Game}
        
        init() {
            self.games <- {}
        }
        
        access(all) fun createGame(
            questionText: String,
            entryFee: UFix64,
            creator: Address,
            roundDuration: UFix64
        ): UInt64 {
            let game <- create Game(
                questionText: questionText,
                entryFee: entryFee,
                creator: creator,
                roundDuration: roundDuration
            )
            let gameId = game.gameId
            self.games[gameId] <-! game
            return gameId
        }
        
        access(all) fun borrowGame(gameId: UInt64): &Game? {
            return &self.games[gameId]
        }
    }
    
    // Get contract account
    access(all) fun getAccount(): &Account {
        return self.account
    }
    
    init(platformFeeRecipient: Address) {
        self.nextGameId = 1
        self.totalFeePercentage = 0.03  // 3% total fee
        self.platformFeePercentage = 0.02  // 2% goes to platform recipient
        self.storageFeePercentage = 0.01  // 1% stays in contract for storage
        self.platformFeeRecipient = platformFeeRecipient
        self.contractStorageVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
        
        self.GameStoragePath = /storage/MinorityRuleGameManager
        self.GamePublicPath = /public/MinorityRuleGameManager
        self.VotingTokenStoragePath = /storage/MinorityRuleVotingToken
        self.VotingTokenPublicPath = /public/MinorityRuleVotingToken
        
        // Save game manager to contract account
        self.account.storage.save(<- create GameManager(), to: self.GameStoragePath)
        
        // Create public capability for GameManager
        self.account.capabilities.publish(
            self.account.capabilities.storage.issue<&{GameManagerPublic}>(self.GameStoragePath),
            at: self.GamePublicPath
        )
    }
}