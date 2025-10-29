import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"
// ProcessRoundHandler will be used via account reference

access(all) contract MinorityRuleGame {

    // Events - Full game history stored here
    access(all) event GameCreated(gameId: UInt64, entryFee: UFix64, creator: Address, questionText: String)
    access(all) event PlayerJoined(gameId: UInt64, player: Address, amount: UFix64, totalPlayers: UInt32)
    access(all) event GameStarted(gameId: UInt64, totalPlayers: UInt32)
    access(all) event VoteSubmitted(gameId: UInt64, round: UInt8, player: Address, vote: Bool)
    access(all) event VoteCommitted(gameId: UInt64, round: UInt8, player: Address)
    access(all) event VoteRevealed(gameId: UInt64, round: UInt8, player: Address, vote: Bool)
    access(all) event CommitPhaseStarted(gameId: UInt64, round: UInt8, deadline: UFix64)
    access(all) event RevealPhaseStarted(gameId: UInt64, round: UInt8, deadline: UFix64)
    access(all) event InvalidReveal(gameId: UInt64, round: UInt8, player: Address)
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
        access(all) case commitPhase
        access(all) case revealPhase
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

    // Player commit record (stores hash of vote + salt)
    access(all) struct CommitRecord {
        access(all) let round: UInt8
        access(all) let commitHash: String
        access(all) let timestamp: UFix64
        
        init(round: UInt8, commitHash: String) {
            self.round = round
            self.commitHash = commitHash
            self.timestamp = getCurrentBlock().timestamp
        }
    }

    // Player reveal record (stores revealed vote + salt)
    access(all) struct RevealRecord {
        access(all) let round: UInt8
        access(all) let vote: Bool
        access(all) let salt: String
        access(all) let timestamp: UFix64
        
        init(round: UInt8, vote: Bool, salt: String) {
            self.round = round
            self.vote = vote
            self.salt = salt
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
        
        // Commit-reveal tracking
        access(all) var currentRoundCommits: {Address: CommitRecord}
        access(all) var currentRoundReveals: {Address: RevealRecord}
        access(all) var commitDeadline: UFix64
        access(all) var revealDeadline: UFix64
        
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
            
            // Initialize commit-reveal tracking
            self.currentRoundCommits = {}
            self.currentRoundReveals = {}
            self.commitDeadline = getCurrentBlock().timestamp + (roundDuration * 0.8) // 80% for commit
            self.revealDeadline = getCurrentBlock().timestamp + roundDuration // 20% for reveal
            
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
                // remainingPlayers will be set correctly in initializeGameIfNeeded()
                // No need to manually add here to avoid duplicates
            }
        }
        
        // Initialize game after first player joins
        access(self) fun initializeGameIfNeeded() {
            // Only initialize once when first player joins
            if self.totalPlayers == 1 {
                self.currentRoundTotalVotes = self.totalPlayers
                
                // Don't initialize remainingPlayers here - it will be set correctly 
                // in processRound() for Round 1 by checking all players who joined
                
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
        
        // Submit vote commitment (hash of vote + salt)
        access(all) fun submitCommit(player: Address, commitHash: String) {
            pre {
                self.state == GameState.commitPhase: "Commit phase is not active"
                // Round 1: All players who joined can commit
                // Round 2+: Only remaining players from previous round can commit
                (self.currentRound == 1 && self.players.contains(player)) || 
                    (self.currentRound > 1 && self.remainingPlayers.contains(player)): 
                    "Player not eligible to commit in current round"
                self.currentRoundCommits[player] == nil: "Already committed this round"
                getCurrentBlock().timestamp <= self.commitDeadline: "Commit deadline has passed"
                commitHash.length == 64: "Commit hash must be 64 characters (SHA3-256)"
            }
            
            // Store commitment
            let commitRecord = CommitRecord(round: self.currentRound, commitHash: commitHash)
            self.currentRoundCommits[player] = commitRecord
            
            emit VoteCommitted(
                gameId: self.gameId,
                round: self.currentRound,
                player: player
            )
            
            // Check if all eligible players have committed
            let eligiblePlayers = self.currentRound == 1 ? self.players : self.remainingPlayers
            if self.currentRoundCommits.length == eligiblePlayers.length {
                self.startRevealPhase()
            }
        }
        
        // Submit vote reveal (actual vote + salt for verification)
        access(all) fun submitReveal(player: Address, vote: Bool, salt: String) {
            pre {
                self.state == GameState.revealPhase: "Reveal phase is not active"
                self.currentRoundCommits[player] != nil: "No commitment found for player"
                self.currentRoundReveals[player] == nil: "Already revealed this round"
                getCurrentBlock().timestamp <= self.revealDeadline: "Reveal deadline has passed"
                salt.length == 64: "Salt must be 64 characters (32-byte hex)"
            }
            
            // Verify the reveal matches the commitment
            let voteString = vote ? "true" : "false"
            let combinedString = voteString.concat(salt)
            let calculatedHash = String.encodeHex(HashAlgorithm.SHA3_256.hash(combinedString.utf8))
            
            let commitment = self.currentRoundCommits[player]!
            if calculatedHash != commitment.commitHash {
                emit InvalidReveal(
                    gameId: self.gameId,
                    round: self.currentRound,
                    player: player
                )
                panic("Reveal does not match commitment")
            }
            
            // Store valid reveal
            let revealRecord = RevealRecord(round: self.currentRound, vote: vote, salt: salt)
            self.currentRoundReveals[player] = revealRecord
            
            // Update vote counts
            if vote {
                self.currentRoundYesVotes = self.currentRoundYesVotes + 1
            } else {
                self.currentRoundNoVotes = self.currentRoundNoVotes + 1
            }
            
            // Store vote in history
            let voteRecord = VoteRecord(round: self.currentRound, vote: vote)
            if let history = self.playerVoteHistory[player] {
                history.append(voteRecord)
                self.playerVoteHistory[player] = history
            }
            
            emit VoteRevealed(
                gameId: self.gameId,
                round: self.currentRound,
                player: player,
                vote: vote
            )
            
            // Check if all committed players have revealed or reveal deadline passed
            if self.currentRoundReveals.length == self.currentRoundCommits.length ||
               getCurrentBlock().timestamp > self.revealDeadline {
                self.startProcessingRound()
            }
        }
        
        // Start commit phase
        access(all) fun startCommitPhase() {
            pre {
                self.state == GameState.votingOpen: "Game must be in voting open state"
            }
            
            self.state = GameState.commitPhase
            let commitDuration = self.roundDuration * 0.8  // 80% of round for commits
            self.commitDeadline = getCurrentBlock().timestamp + commitDuration
            self.revealDeadline = getCurrentBlock().timestamp + self.roundDuration
            
            emit CommitPhaseStarted(
                gameId: self.gameId,
                round: self.currentRound,
                deadline: self.commitDeadline
            )
        }
        
        // Start reveal phase
        access(self) fun startRevealPhase() {
            pre {
                self.state == GameState.commitPhase: "Game must be in commit phase"
            }
            
            self.state = GameState.revealPhase
            
            emit RevealPhaseStarted(
                gameId: self.gameId,
                round: self.currentRound,
                deadline: self.revealDeadline
            )
        }
        
        // Start processing round
        access(self) fun startProcessingRound() {
            pre {
                self.state == GameState.revealPhase: "Game must be in reveal phase"
            }
            
            self.state = GameState.processingRound
            // processRound() will be called next
        }
        
        // Process the current round
        access(all) fun processRound() {
            pre {
                self.state == GameState.processingRound: "Game not ready for processing"
            }
            
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
            
            // Update remaining players - only those who voted minority vote continue
            let newRemainingPlayers: [Address] = []
            
            // Handle both voting mechanisms: simple voting and commit-reveal
            if self.currentRoundReveals.length > 0 {
                // Commit-reveal mode: Only players who successfully revealed can advance
                for player in self.currentRoundReveals.keys {
                    let revealRecord = self.currentRoundReveals[player]!
                    if revealRecord.vote == minorityVote {
                        newRemainingPlayers.append(player)
                    }
                }
            } else {
                // Simple voting mode: Check vote history for players who voted minority
                // For Round 1, check all players; for later rounds, check remainingPlayers
                let eligiblePlayers = self.currentRound == 1 ? self.players : self.remainingPlayers
                
                for player in eligiblePlayers {
                    if let voteHistory = self.playerVoteHistory[player] {
                        // Find this round's vote
                        for voteRecord in voteHistory {
                            if voteRecord.round == self.currentRound && voteRecord.vote == minorityVote {
                                newRemainingPlayers.append(player)
                                break
                            }
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
                
                // Clear commit-reveal data for next round
                self.currentRoundCommits = {}
                self.currentRoundReveals = {}
                
                // Set deadlines for next round
                self.roundDeadline = getCurrentBlock().timestamp + self.roundDuration
                self.commitDeadline = getCurrentBlock().timestamp + (self.roundDuration * 0.8)
                self.revealDeadline = getCurrentBlock().timestamp + self.roundDuration
                
                // Start directly in commit phase for subsequent rounds
                self.state = GameState.commitPhase
                
                emit CommitPhaseStarted(
                    gameId: self.gameId,
                    round: self.currentRound,
                    deadline: self.commitDeadline
                )
                
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
                "playerVoteHistory": self.playerVoteHistory,
                "remainingPlayers": self.remainingPlayers,
                "winners": self.winners,
                "roundResults": self.roundResults,
                "prizesDistributed": self.state == GameState.completed,
                "commitDeadline": self.commitDeadline,
                "revealDeadline": self.revealDeadline,
                "currentRoundCommits": self.currentRoundCommits.keys,
                "currentRoundReveals": self.currentRoundReveals.keys,
                "commitCount": self.currentRoundCommits.length,
                "revealCount": self.currentRoundReveals.length
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