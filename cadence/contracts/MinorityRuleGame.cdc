import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

access(all) contract MinorityRuleGame {

    // Events - Full game history stored here
    access(all) event GameCreated(gameId: UInt64, entryFee: UFix64, creator: Address, questionText: String)
    access(all) event PlayerJoined(gameId: UInt64, player: Address, amount: UFix64, totalPlayers: UInt32)
    access(all) event GameStarted(gameId: UInt64, totalPlayers: UInt32)
    access(all) event VoteSubmitted(gameId: UInt64, round: UInt8, player: Address, vote: Bool)
    access(all) event RoundCompleted(gameId: UInt64, round: UInt8, yesCount: UInt32, noCount: UInt32, minorityVote: Bool, votesRemaining: UInt32)
    access(all) event GameCompleted(gameId: UInt64, totalRounds: UInt8, finalPrize: UFix64, platformFee: UFix64)
    access(all) event WinnerClaimed(gameId: UInt64, winner: Address, amount: UFix64)

    // Contract state
    access(all) var nextGameId: UInt64
    access(all) var platformFeePercentage: UFix64
    access(all) let platformFeeRecipient: Address
    
    // Storage paths
    access(all) let GameStoragePath: StoragePath
    access(all) let GamePublicPath: PublicPath
    access(all) let VotingTokenStoragePath: StoragePath
    access(all) let VotingTokenPublicPath: PublicPath

    // Game states
    access(all) enum GameState: UInt8 {
        access(all) case gameCreated
        access(all) case votingOpen
        access(all) case processingRound
        access(all) case completed
    }

    // GameTicket - Proof of joining a game (cannot be modified by user)
    access(all) resource GameTicket {
        access(all) let gameId: UInt64
        access(all) let playerAddress: Address
        access(all) let joinedAt: UFix64
        
        init(gameId: UInt64, playerAddress: Address) {
            self.gameId = gameId
            self.playerAddress = playerAddress
            self.joinedAt = getCurrentBlock().timestamp
        }
    }

    // Ultra-efficient Game resource - minimal storage
    access(all) resource Game {
        access(all) let gameId: UInt64
        access(all) let questionText: String
        access(all) let entryFee: UFix64
        access(all) let creator: Address
        access(all) let roundDuration: UFix64
        
        // Minimal state tracking
        access(all) var state: GameState
        access(all) var currentRound: UInt8
        access(all) var roundDeadline: UFix64
        access(all) var totalPlayers: UInt32
        
        // Current round vote counts only
        access(all) var currentRoundYesVotes: UInt32
        access(all) var currentRoundNoVotes: UInt32
        access(all) var currentRoundTotalVotes: UInt32
        
        // Round results - which answer was minority
        access(all) var roundResults: {UInt8: Bool}
        
        // Prize vault
        access(all) var prizeVault: @{FungibleToken.Vault}
        
        // Winners - only populated at game end
        access(all) var winners: [Address]
        access(all) var winnersClaimed: {Address: Bool}
        
        // Track who voted each round (for double-vote prevention)
        access(self) var roundVoters: {UInt8: {Address: Bool}}
        
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
            
            self.state = GameState.gameCreated
            self.currentRound = 0
            self.roundDeadline = 0.0
            self.totalPlayers = 0
            
            self.currentRoundYesVotes = 0
            self.currentRoundNoVotes = 0
            self.currentRoundTotalVotes = 0
            
            self.roundResults = {}
            self.winners = []
            self.winnersClaimed = {}
            self.roundVoters = {}
            
            self.prizeVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
            
            emit GameCreated(
                gameId: self.gameId,
                entryFee: self.entryFee,
                creator: self.creator,
                questionText: self.questionText
            )
        }
        
        // Player joins the game - returns GameTicket
        access(all) fun joinGame(player: Address, payment: @{FungibleToken.Vault}): @GameTicket {
            pre {
                self.state == GameState.gameCreated: "Game is not accepting new players (must be before round 2)"
                payment.balance == self.entryFee: "Incorrect entry fee amount"
            }
            
            self.prizeVault.deposit(from: <- payment)
            self.totalPlayers = self.totalPlayers + 1
            
            emit PlayerJoined(
                gameId: self.gameId, 
                player: player, 
                amount: self.entryFee,
                totalPlayers: self.totalPlayers
            )
            
            // Return game ticket as proof of joining
            return <- create GameTicket(gameId: self.gameId, playerAddress: player)
        }
        
        // Start the game
        access(all) fun startGame() {
            pre {
                self.state == GameState.gameCreated: "Game already started"
                self.totalPlayers > 0: "No players have joined"
            }
            
            self.state = GameState.votingOpen
            self.currentRound = 1
            self.roundDeadline = getCurrentBlock().timestamp + self.roundDuration
            self.currentRoundTotalVotes = self.totalPlayers
            
            emit GameStarted(gameId: self.gameId, totalPlayers: self.totalPlayers)
            
            // If only 1 or 2 players, end game immediately
            if self.totalPlayers <= 2 {
                self.endGame()
            }
        }
        
        // Submit vote using GameTicket
        access(all) fun submitVote(player: Address, vote: Bool, ticket: &GameTicket) {
            pre {
                self.state == GameState.votingOpen: "Voting is not open"
                ticket.gameId == self.gameId: "Wrong game ticket"
                ticket.playerAddress == player: "Ticket doesn't match player"
                getCurrentBlock().timestamp <= self.roundDeadline: "Round deadline has passed"
            }
            
            // Initialize round voters if needed
            if self.roundVoters[self.currentRound] == nil {
                self.roundVoters[self.currentRound] = {}
            }
            
            // Get current round voters
            let currentRoundVoters = self.roundVoters[self.currentRound]!
            
            // Check if already voted
            assert(currentRoundVoters[player] == nil, message: "Already voted this round")
            
            // Update vote counts
            if vote {
                self.currentRoundYesVotes = self.currentRoundYesVotes + 1
            } else {
                self.currentRoundNoVotes = self.currentRoundNoVotes + 1
            }
            
            // Mark as voted - need to update the whole dictionary
            currentRoundVoters[player] = true
            self.roundVoters[self.currentRound] = currentRoundVoters
            
            emit VoteSubmitted(
                gameId: self.gameId,
                round: self.currentRound,
                player: player,
                vote: vote
            )
            
            // If all expected votes received, process round
            if (self.currentRoundYesVotes + self.currentRoundNoVotes) >= self.currentRoundTotalVotes {
                self.processRound()
            }
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
            
            // Check if game should end
            if votesRemaining <= 2 || votesRemaining == 0 {
                self.endGame()
            } else {
                // Start next round
                self.currentRound = self.currentRound + 1
                self.currentRoundYesVotes = 0
                self.currentRoundNoVotes = 0
                self.currentRoundTotalVotes = votesRemaining
                self.roundDeadline = getCurrentBlock().timestamp + self.roundDuration
                self.state = GameState.votingOpen
            }
        }
        
        // End the game
        access(self) fun endGame() {
            self.state = GameState.completed
            
            // Calculate platform fee
            let totalPrize = self.prizeVault.balance
            let platformFee = totalPrize * MinorityRuleGame.platformFeePercentage
            
            // Send platform fee directly to recipient
            if platformFee > 0.0 {
                let platformFeeVault <- self.prizeVault.withdraw(amount: platformFee)
                let recipientVault = getAccount(MinorityRuleGame.platformFeeRecipient)
                    .capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
                    ?? panic("Could not borrow platform fee recipient vault")
                recipientVault.deposit(from: <- platformFeeVault)
            }
            
            emit GameCompleted(
                gameId: self.gameId,
                totalRounds: self.currentRound,
                finalPrize: self.prizeVault.balance,
                platformFee: platformFee
            )
        }
        
        // Winners claim their prize - verified through events
        access(all) fun claimPrize(winner: Address, ticket: &GameTicket): @{FungibleToken.Vault} {
            pre {
                self.state == GameState.completed: "Game not completed"
                ticket.gameId == self.gameId: "Wrong game ticket"
                ticket.playerAddress == winner: "Ticket doesn't match claimer"
                self.winnersClaimed[winner] != true: "Already claimed"
            }
            
            // Add to winners list
            if !self.winners.contains(winner) {
                self.winners.append(winner)
            }
            
            // Mark as claimed
            self.winnersClaimed[winner] = true
            
            // Calculate prize share (max 2 winners)
            let winnersCount = self.currentRoundYesVotes > 0 || self.currentRoundNoVotes > 0 
                ? (self.currentRoundYesVotes <= self.currentRoundNoVotes ? self.currentRoundYesVotes : self.currentRoundNoVotes)
                : 1
            
            let prizeAmount = self.prizeVault.balance / UFix64(winnersCount)
            
            emit WinnerClaimed(gameId: self.gameId, winner: winner, amount: prizeAmount)
            
            return <- self.prizeVault.withdraw(amount: prizeAmount)
        }
        
        // Note: Winner verification happens off-chain via event analysis
        // In production, you would use an oracle or have winners submit merkle proofs
        // For now, we trust that only legitimate winners will claim (enforced socially)
        
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
                "winners": self.winners,
                "roundResults": self.roundResults
            }
        }
    }
    
    // Public interface for GameManager
    access(all) resource interface GameManagerPublic {
        access(all) fun borrowGame(gameId: UInt64): &Game?
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
    
    // Create a new game manager
    access(all) fun createGameManager(): @GameManager {
        return <- create GameManager()
    }
    
    // Get contract account
    access(all) fun getAccount(): &Account {
        return self.account
    }
    
    init(platformFeeRecipient: Address) {
        self.nextGameId = 1
        self.platformFeePercentage = 0.04 // 4%
        self.platformFeeRecipient = platformFeeRecipient
        
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