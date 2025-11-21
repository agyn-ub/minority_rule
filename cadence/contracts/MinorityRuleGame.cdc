import "FungibleToken"
import "FlowToken"

access(all) contract MinorityRuleGame {

    // Events - Full game history stored here
    access(all) event GameCreated(gameId: UInt64, entryFee: UFix64, creator: Address, questionText: String)
    access(all) event PlayerJoined(gameId: UInt64, player: Address, amount: UFix64, totalPlayers: UInt32)
    access(all) event GameStarted(gameId: UInt64, totalPlayers: UInt32)
    access(all) event VoteSubmitted(gameId: UInt64, round: UInt8, player: Address, vote: Bool)
    access(all) event VoteCommitted(gameId: UInt64, round: UInt8, player: Address)
    access(all) event VoteRevealed(gameId: UInt64, round: UInt8, player: Address, vote: Bool)
    access(all) event CommitPhaseStarted(gameId: UInt64, round: UInt8, deadline: UFix64)
    access(all) event RevealPhaseStarted(gameId: UInt64, round: UInt8)
    access(all) event NewRoundStarted(gameId: UInt64, round: UInt8)
    access(all) event CommitDeadlineSet(gameId: UInt64, round: UInt8, duration: UFix64, deadline: UFix64)
    access(all) event RevealDeadlineSet(gameId: UInt64, round: UInt8, duration: UFix64, deadline: UFix64)
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
    access(self) var userGameHistory: {Address: [UInt64]}  // Maps user address to array of game IDs they've joined
    
    // Storage paths
    access(all) let GameStoragePath: StoragePath
    access(all) let GamePublicPath: PublicPath
    access(all) let VotingTokenStoragePath: StoragePath
    access(all) let VotingTokenPublicPath: PublicPath

    // Game states
    access(all) enum GameState: UInt8 {
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
        // State tracking
        access(all) var state: GameState
        access(all) var currentRound: UInt8
        access(all) var totalPlayers: UInt32
        
        // Store all players (contract pays for storage)
        access(all) var players: [Address]
        access(all) var playerVoteHistory: {Address: [VoteRecord]}
        
        // Current round tracking
        access(all) var currentRoundYesVotes: UInt32
        access(all) var currentRoundNoVotes: UInt32
        
        // Commit-reveal tracking
        access(all) var currentRoundCommits: {Address: CommitRecord}
        access(all) var currentRoundReveals: {Address: RevealRecord}
        access(all) var commitDeadline: UFix64
        access(all) var revealDeadline: UFix64
        
        // Creator-controlled timing storage
        access(all) var roundCommitDurations: {UInt8: UFix64}  // Round -> Commit duration
        access(all) var roundRevealDurations: {UInt8: UFix64}  // Round -> Reveal duration
        access(all) var currentCommitDuration: UFix64?
        access(all) var currentRevealDuration: UFix64?
        
        // Round results - which answer was minority
        access(all) var roundResults: {UInt8: Bool}
        
        // Players remaining after each round
        access(all) var remainingPlayers: [Address]
        
        // Prize vault
        access(all) var prizeVault: @{FungibleToken.Vault}
        
        
        // Winners - populated at game end
        access(all) var winners: [Address]
        
        init(
            questionText: String,
            entryFee: UFix64,
            creator: Address
        ) {
            self.gameId = MinorityRuleGame.nextGameId
            MinorityRuleGame.nextGameId = MinorityRuleGame.nextGameId + 1
            
            self.questionText = questionText
            self.entryFee = entryFee
            self.creator = creator
            
            self.state = GameState.commitPhase
            self.currentRound = 1
            self.totalPlayers = 0
            
            self.players = []
            self.playerVoteHistory = {}
            
            self.currentRoundYesVotes = 0
            self.currentRoundNoVotes = 0
            
            // Initialize commit-reveal tracking
            self.currentRoundCommits = {}
            self.currentRoundReveals = {}
            self.commitDeadline = 0.0 // Creator will set this manually
            self.revealDeadline = 0.0 // Creator will set this manually
            
            // Initialize timing storage
            self.roundCommitDurations = {}
            self.roundRevealDurations = {}
            self.currentCommitDuration = nil
            self.currentRevealDuration = nil
            
            self.roundResults = {}
            self.remainingPlayers = []
            self.winners = []
            
            self.prizeVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
            
            emit GameCreated(
                gameId: self.gameId,
                entryFee: self.entryFee,
                creator: self.creator,
                questionText: self.questionText
            )
            
            // Emit commit phase started event
            emit CommitPhaseStarted(
                gameId: self.gameId,
                round: self.currentRound,
                deadline: self.commitDeadline
            )
        }
        
        // Player joins the game
        access(all) fun joinGame(player: Address, payment: @{FungibleToken.Vault}) {
            pre {
                self.currentRound == 1: "Can only join during Round 1"
                self.state == GameState.commitPhase: "Game is not accepting new players"
                payment.balance == self.entryFee: "Incorrect entry fee amount"
                !self.players.contains(player): "Player already joined"
            }
            
            self.prizeVault.deposit(from: <- payment)
            self.totalPlayers = self.totalPlayers + 1
            
            // Store player in array
            self.players.append(player)
            self.playerVoteHistory[player] = []
            
            // Add game to user's history
            if MinorityRuleGame.userGameHistory[player] == nil {
                MinorityRuleGame.userGameHistory[player] = []
            }
            MinorityRuleGame.userGameHistory[player]!.append(self.gameId)
            
            emit PlayerJoined(
                gameId: self.gameId, 
                player: player, 
                amount: self.entryFee,
                totalPlayers: self.totalPlayers
            )
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
                self.commitDeadline == 0.0 || getCurrentBlock().timestamp <= self.commitDeadline: "Commit deadline has passed"
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
        }
        
        // Submit vote reveal (actual vote + salt for verification)
        access(all) fun submitReveal(player: Address, vote: Bool, salt: String) {
            pre {
                self.state == GameState.revealPhase: "Reveal phase is not active"
                self.currentRoundCommits[player] != nil: "No commitment found for player"
                self.currentRoundReveals[player] == nil: "Already revealed this round"
                self.revealDeadline == 0.0 || getCurrentBlock().timestamp <= self.revealDeadline: "Reveal deadline has passed"
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
                panic("Reveal does not match commitment. Expected: "
                    .concat(commitment.commitHash)
                    .concat(", Calculated: ")
                    .concat(calculatedHash)
                    .concat(", Vote: ")
                    .concat(vote ? "true" : "false")
                    .concat(", Salt: ")
                    .concat(salt))
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

        access(all) fun setCommitDeadline(durationSeconds: UFix64) {
            pre {
                self.state == GameState.commitPhase: "Game must be in commit phase"
                durationSeconds > 0.0: "Duration must be positive"
            }
            
            let deadline = getCurrentBlock().timestamp + durationSeconds
            self.commitDeadline = deadline

            emit CommitDeadlineSet(
                gameId: self.gameId,
                round: self.currentRound,
                duration: durationSeconds,
                deadline: deadline
            )
        }
        
        access(all) fun setRevealDeadline(durationSeconds: UFix64) {
            pre {
                self.state == GameState.commitPhase || self.state == GameState.revealPhase: "Game must be in commit phase or reveal phase"
                durationSeconds > 0.0: "Duration must be positive"
            }
            
            let deadline = getCurrentBlock().timestamp + durationSeconds
            self.revealDeadline = deadline

            emit RevealDeadlineSet(
                gameId: self.gameId,
                round: self.currentRound,
                duration: durationSeconds,
                deadline: deadline
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

        // Start reveal phase. Must be called by forte scheduler when commit deadline is reached.
        access(all) fun startRevealPhase() {
            pre {
                self.state == GameState.commitPhase: "Game must be in commit phase"
            }
            
            self.state = GameState.revealPhase
            
            emit RevealPhaseStarted(
                gameId: self.gameId,
                round: self.currentRound
            )
        }

        // Process the current round. Must be called by forte scheduler when reveal deadline is reached.
        access(all) fun processRound() {
            pre {
                self.state == GameState.revealPhase: "Must be in reveal phase to process round"
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
            
            // Update remaining players - only those who voted minority vote continue
            let newRemainingPlayers: [Address] = []
            
            // Handle both voting mechanisms: commit-reveal
            if self.currentRoundReveals.length > 0 {
                // Commit-reveal mode: Only players who successfully revealed can advance
                for player in self.currentRoundReveals.keys {
                    let revealRecord = self.currentRoundReveals[player]!
                    if revealRecord.vote == minorityVote {
                        newRemainingPlayers.append(player)
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
                
                // Clear commit-reveal data for next round
                self.currentRoundCommits = {}
                self.currentRoundReveals = {}
                
                // Reset deadlines - creator will set new ones manually
                self.commitDeadline = 0.0
                self.revealDeadline = 0.0
                self.currentCommitDuration = nil
                self.currentRevealDuration = nil
                
                // Start directly in commit phase for subsequent rounds
                self.state = GameState.commitPhase
                
                emit NewRoundStarted(
                    gameId: self.gameId,
                    round: self.currentRound
                )
                
                log("Next round ready - creator must manually schedule via Forte")
            }
        }

        // Get round timing information
        access(all) fun getRoundTimings(round: UInt8): {String: UFix64} {
            return {
                "commitDuration": self.roundCommitDurations[round] ?? 0.0,
                "revealDuration": self.roundRevealDurations[round] ?? 0.0
            }
        }
        
        // Get current phase information
        access(all) fun getCurrentPhaseInfo(): {String: AnyStruct} {
            return {
                "state": self.state.rawValue,
                "stateName": self.state,
                "round": self.currentRound,
                "commitDeadline": self.commitDeadline,
                "revealDeadline": self.revealDeadline,
                "currentCommitDuration": self.currentCommitDuration,
                "currentRevealDuration": self.currentRevealDuration,
                "timeRemaining": self.state == GameState.commitPhase 
                    ? (self.commitDeadline > getCurrentBlock().timestamp ? self.commitDeadline - getCurrentBlock().timestamp : 0.0)
                    : (self.revealDeadline > getCurrentBlock().timestamp ? self.revealDeadline - getCurrentBlock().timestamp : 0.0)
            }
        }
        
        // Format Unix timestamp to human-readable date string
        access(all) fun formatTimestamp(_ timestamp: UFix64): String {
            if timestamp == 0.0 {
                return "Not set"
            }
            
            // Convert UFix64 timestamp to basic date components
            let totalSeconds = UInt64(timestamp)
            let totalMinutes = totalSeconds / 60
            let totalHours = totalMinutes / 60
            let totalDays = totalHours / 24
            
            // Approximate calculation for demonstration
            // In production, you'd want a more sophisticated date library
            let year = 1970 + Int(totalDays / 365)
            let dayOfYear = totalDays % 365
            let month = (dayOfYear / 30) + 1  // Rough approximation
            let day = (dayOfYear % 30) + 1
            let hour = totalHours % 24
            let minute = totalMinutes % 60
            let second = totalSeconds % 60
            
            return year.toString().concat("/")
                .concat(month.toString()).concat("/")
                .concat(day.toString()).concat(" ")
                .concat(hour.toString()).concat(":")
                .concat(minute.toString()).concat(":")
                .concat(second.toString()).concat(" UTC")
        }
        
        // Get commit deadline in human-readable format
        access(all) fun getCommitDeadlineFormatted(): String {
            return self.formatTimestamp(self.commitDeadline)
        }
        
        // Get reveal deadline in human-readable format  
        access(all) fun getRevealDeadlineFormatted(): String {
            return self.formatTimestamp(self.revealDeadline)
        }
        
        // Get time remaining in current phase as human-readable string
        access(all) fun getTimeRemainingInPhase(): String {
            let currentTime = getCurrentBlock().timestamp
            var deadline: UFix64 = 0.0
            
            switch self.state {
                case GameState.commitPhase:
                    deadline = self.commitDeadline
                case GameState.revealPhase:
                    deadline = self.revealDeadline
                default:
                    return "No active deadline"
            }
            
            if deadline == 0.0 {
                return "Deadline not set"
            }
            
            if currentTime >= deadline {
                return "Phase ended"
            }
            
            let remainingSeconds = UInt64(deadline - currentTime)
            let hours = remainingSeconds / 3600
            let minutes = (remainingSeconds % 3600) / 60
            let seconds = remainingSeconds % 60
            
            if hours > 0 {
                return hours.toString().concat("h ")
                    .concat(minutes.toString()).concat("m ")
                    .concat(seconds.toString()).concat("s remaining")
            } else if minutes > 0 {
                return minutes.toString().concat("m ")
                    .concat(seconds.toString()).concat("s remaining")
            } else {
                return seconds.toString().concat("s remaining")
            }
        }
        
        // Get complete phase information with formatted times
        access(all) fun getPhaseInfo(): {String: AnyStruct} {
            return {
                "state": self.state.rawValue,
                "stateName": self.state,
                "round": self.currentRound,
                "commitDeadline": self.commitDeadline,
                "commitDeadlineFormatted": self.getCommitDeadlineFormatted(),
                "revealDeadline": self.revealDeadline,
                "revealDeadlineFormatted": self.getRevealDeadlineFormatted(),
                "timeRemaining": self.getTimeRemainingInPhase(),
                "currentCommitDuration": self.currentCommitDuration,
                "currentRevealDuration": self.currentRevealDuration
            }
        }
        
        // Test function for debugging commit-reveal hash calculations
        access(all) fun testCommitReveal(commitHash: String, vote: Bool, salt: String): {String: String} {
            // Same calculation as submitReveal
            let voteString = vote ? "true" : "false"
            let combinedString = voteString.concat(salt)
            let calculatedHash = String.encodeHex(HashAlgorithm.SHA3_256.hash(combinedString.utf8))
            
            return {
                "expectedHash": commitHash,
                "calculatedHash": calculatedHash,
                "vote": voteString,
                "salt": salt,
                "combinedString": combinedString,
                "matches": calculatedHash == commitHash ? "true" : "false",
                "algorithm": "SHA3_256",
                "voteStringLength": voteString.length.toString(),
                "saltLength": salt.length.toString(),
                "combinedLength": combinedString.length.toString()
            }
        }
    }
    
    // Public interface for GameManager
    access(all) resource interface GameManagerPublic {
        access(all) fun borrowGame(gameId: UInt64): &Game?
        access(all) fun createGame(
            questionText: String,
            entryFee: UFix64,
            creator: Address
        ): UInt64
        
        // Pagination methods
        access(all) fun getGamesPage(startId: UInt64, limit: UInt64): {String: AnyStruct}
        access(all) fun getTotalGamesCount(): UInt64
        
        // User history methods
        access(all) fun getUserGameHistory(player: Address): [UInt64]
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
            creator: Address
        ): UInt64 {
            let game <- create Game(
                questionText: questionText,
                entryFee: entryFee,
                creator: creator
            )
            let gameId = game.gameId
            self.games[gameId] <-! game
            return gameId
        }
        
        access(all) fun borrowGame(gameId: UInt64): &Game? {
            return &self.games[gameId]
        }
        
        // Get total number of games created
        access(all) fun getTotalGamesCount(): UInt64 {
            return MinorityRuleGame.nextGameId - 1
        }
        
        // Get paginated games with full pagination metadata (descending order only)
        // Only returns games in commitPhase (state 0) and first round (round 1)
        access(all) fun getGamesPage(startId: UInt64, limit: UInt64): {String: AnyStruct} {
            var gamesList: [{String: AnyStruct}] = []
            var gamesCollected: UInt64 = 0
            let maxGameId = MinorityRuleGame.nextGameId - 1
            
            // Initialize pagination info
            var hasNext = false
            var hasPrevious = false
            var nextStartId: UInt64? = nil
            var previousStartId: UInt64? = nil
            var firstGameId: UInt64? = nil
            var lastGameId: UInt64? = nil
            
            if maxGameId == 0 {
                return {
                    "games": gamesList,
                    "pagination": {
                        "startId": startId,
                        "limit": limit,
                        "hasNext": false,
                        "hasPrevious": false,
                        "nextStartId": nil,
                        "previousStartId": nil,
                        "returnedCount": 0 as UInt64,
                        "totalGames": 0 as UInt64
                    }
                }
            }
            
            var gameId: UInt64 = startId
            
            // Descending: Start from startId and go backwards
            while gameId >= 1 && gamesCollected < limit {
                if let gameRef = &self.games[gameId] as &Game? {
                    let gameInfo = gameRef.getGameInfo()
                    let state = gameInfo["state"] as! UInt8
                    let currentRound = gameInfo["currentRound"] as! UInt8
                    
                    // Only include games in commitPhase (state 0) and first round (round 1)
                    if state == 0 && currentRound == 1 {
                        gamesList.append(gameInfo)
                        gamesCollected = gamesCollected + 1
                        
                        // Track first and last game IDs for pagination
                        if firstGameId == nil {
                            firstGameId = gameId
                        }
                        lastGameId = gameId
                    }
                }
                gameId = gameId - 1
            }
            
            // Check if there are more games before the last scanned game
            if gameId >= 1 {
                var checkId = gameId
                while checkId >= 1 {
                    if let gameRef = &self.games[checkId] as &Game? {
                        let gameInfo = gameRef.getGameInfo()
                        let state = gameInfo["state"] as! UInt8
                        let currentRound = gameInfo["currentRound"] as! UInt8
                        if state == 0 && currentRound == 1 {
                            hasNext = true
                            nextStartId = checkId
                            break
                        }
                    }
                    checkId = checkId - 1
                }
            }
            
            // Check if there are more games after the first scanned game
            if let firstId = firstGameId {
                var checkId = firstId + 1
                while checkId <= maxGameId {
                    if let gameRef = &self.games[checkId] as &Game? {
                        let gameInfo = gameRef.getGameInfo()
                        let state = gameInfo["state"] as! UInt8
                        let currentRound = gameInfo["currentRound"] as! UInt8
                        if state == 0 && currentRound == 1 {
                            hasPrevious = true
                            previousStartId = checkId
                            break
                        }
                    }
                    checkId = checkId + 1
                }
            }
            
            return {
                "games": gamesList,
                "pagination": {
                    "startId": startId,
                    "limit": limit,
                    "hasNext": hasNext,
                    "hasPrevious": hasPrevious,
                    "nextStartId": nextStartId,
                    "previousStartId": previousStartId,
                    "returnedCount": gamesCollected,
                    "totalGames": maxGameId
                }
            }
        }
        
        // Get user's game history
        access(all) fun getUserGameHistory(player: Address): [UInt64] {
            return MinorityRuleGame.userGameHistory[player] ?? []
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
        self.userGameHistory = {}
        
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