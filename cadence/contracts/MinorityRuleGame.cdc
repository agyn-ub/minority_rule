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
        
        // Winners - populated at game end
        access(all) var winners: [Address]
        access(all) var winnersClaimed: {Address: Bool}
        
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
            
            self.players = []
            self.playerVoteHistory = {}
            
            self.currentRoundYesVotes = 0
            self.currentRoundNoVotes = 0
            self.currentRoundTotalVotes = 0
            self.currentRoundVoters = {}
            
            self.roundResults = {}
            self.remainingPlayers = []
            self.winners = []
            self.winnersClaimed = {}
            
            self.prizeVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
            
            emit GameCreated(
                gameId: self.gameId,
                entryFee: self.entryFee,
                creator: self.creator,
                questionText: self.questionText
            )
        }
        
        // Player joins the game
        access(all) fun joinGame(player: Address, payment: @{FungibleToken.Vault}) {
            pre {
                self.state == GameState.gameCreated: "Game is not accepting new players (must be before round 2)"
                payment.balance == self.entryFee: "Incorrect entry fee amount"
                !self.players.contains(player): "Player already joined"
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
            
            // Initialize remaining players with all players
            self.remainingPlayers = self.players
            
            emit GameStarted(gameId: self.gameId, totalPlayers: self.totalPlayers)
            
            // If only 1 or 2 players, end game immediately
            if self.totalPlayers <= 2 {
                self.endGame()
            }
        }
        
        // Submit vote
        access(all) fun submitVote(player: Address, vote: Bool) {
            pre {
                self.state == GameState.votingOpen: "Voting is not open"
                self.remainingPlayers.contains(player): "Player not in current round"
                self.currentRoundVoters[player] == nil: "Already voted this round"
                getCurrentBlock().timestamp <= self.roundDeadline: "Round deadline has passed"
            }
            
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
            
            // Update remaining players - only those who voted minority continue
            let newRemainingPlayers: [Address] = []
            for player in self.remainingPlayers {
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
        
        // Winners claim their prize
        access(all) fun claimPrize(winner: Address): @{FungibleToken.Vault} {
            pre {
                self.state == GameState.completed: "Game not completed"
                self.winners.contains(winner): "Not a winner"
                self.winnersClaimed[winner] != true: "Already claimed"
            }
            
            // Mark as claimed
            self.winnersClaimed[winner] = true
            
            // Calculate prize share
            let winnersCount = UInt64(self.winners.length)
            let prizeAmount = winnersCount > 0 ? self.prizeVault.balance / UFix64(winnersCount) : self.prizeVault.balance
            
            emit WinnerClaimed(gameId: self.gameId, winner: winner, amount: prizeAmount)
            
            return <- self.prizeVault.withdraw(amount: prizeAmount)
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
                "remainingPlayers": self.remainingPlayers,
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
        self.platformFeePercentage = 0.02 // 2% platform fee
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