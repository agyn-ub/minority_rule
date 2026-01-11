// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title MinorityRuleGame
 * @notice A game where players answer yes/no questions, and only those in the minority advance
 * @dev Implements commit-reveal voting to prevent front-running
 */
contract MinorityRuleGame {
    // ============ Errors ============

    error InvalidEntryFee();
    error AlreadyJoined();
    error NotInCommitPhase();
    error NotInRevealPhase();
    error NotInZeroPhase();
    error CommitDeadlinePassed();
    error RevealDeadlinePassed();
    error AlreadyCommitted();
    error AlreadyRevealed();
    error NoCommitFound();
    error InvalidReveal();
    error NotEligibleToVote();
    error CanOnlyJoinRoundOne();
    error InvalidDuration();
    error CommitDeadlineNotPassed();
    error NoCommitsYet();
    error NotInRevealPhaseForProcessing();
    error DeadlineNotPassedOrNotAllRevealed();
    error TransferFailed();

    // ============ Events ============

    event GameCreated(
        uint256 indexed gameId,
        uint256 entryFee,
        address indexed creator,
        string questionText,
        GameState phase
    );

    event PlayerJoined(
        uint256 indexed gameId,
        address indexed player,
        uint256 amount,
        uint32 totalPlayers
    );

    event VoteCommitted(
        uint256 indexed gameId,
        uint8 round,
        address indexed player,
        bytes32 commitHash
    );

    event VoteRevealed(
        uint256 indexed gameId,
        uint8 round,
        address indexed player,
        bool vote
    );

    event CommitPhaseStarted(
        uint256 indexed gameId,
        uint8 round,
        uint256 deadline
    );

    event RevealPhaseStarted(
        uint256 indexed gameId,
        uint8 round,
        uint256 deadline
    );

    event RoundCompleted(
        uint256 indexed gameId,
        uint8 round,
        uint32 yesCount,
        uint32 noCount,
        bool minorityVote,
        uint32 votesRemaining
    );

    event GameCompleted(
        uint256 indexed gameId,
        uint8 totalRounds,
        uint256 finalPrize,
        uint256 platformFee,
        address[] winners,
        uint256 prizePerWinner
    );

    // ============ Enums ============

    enum GameState {
        ZeroPhase,      // Game created, waiting for commit deadline to be set
        CommitPhase,    // Players can join (round 1) and commit votes
        RevealPhase,    // Players reveal their votes
        Completed       // Game ended, prizes distributed
    }

    // ============ Structs ============

    struct CommitRecord {
        bytes32 commitHash;
        uint256 timestamp;
    }

    struct RevealRecord {
        bool vote;
        bytes32 salt;
        uint256 timestamp;
    }

    struct Game {
        uint256 gameId;
        string questionText;
        uint256 entryFee;
        address creator;
        GameState state;
        uint8 currentRound;
        uint32 totalPlayers;

        // Player tracking
        address[] players;
        address[] remainingPlayers;
        address[] winners;

        // Current round state
        uint32 currentRoundYesVotes;
        uint32 currentRoundNoVotes;
        uint256 commitDeadline;
        uint256 revealDeadline;

        // Prize pool
        uint256 prizePool;

        // Round results (round => minority vote)
        mapping(uint8 => bool) roundResults;

        // Current round commits/reveals
        mapping(address => CommitRecord) currentRoundCommits;
        mapping(address => RevealRecord) currentRoundReveals;
        mapping(address => bool) hasCommitted;
        mapping(address => bool) hasRevealed;
    }

    // ============ State Variables ============

    uint256 public nextGameId = 1;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 2; // 2%
    address public immutable platformFeeRecipient;

    mapping(uint256 => Game) public games;

    // ============ Constructor ============

    constructor(address _platformFeeRecipient) {
        require(_platformFeeRecipient != address(0), "Invalid platform recipient");
        platformFeeRecipient = _platformFeeRecipient;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new game
     * @param questionText The yes/no question for the game
     * @param entryFee Entry fee in wei that players must pay to join
     * @return gameId The ID of the created game
     */
    function createGame(
        string calldata questionText,
        uint256 entryFee
    ) external returns (uint256) {
        require(entryFee > 0, "Entry fee must be greater than 0");

        uint256 gameId = nextGameId++;
        Game storage game = games[gameId];

        game.gameId = gameId;
        game.questionText = questionText;
        game.entryFee = entryFee;
        game.creator = msg.sender;
        game.state = GameState.ZeroPhase;
        game.currentRound = 1;
        game.totalPlayers = 0;
        game.prizePool = 0;

        emit GameCreated(gameId, entryFee, msg.sender, questionText, GameState.ZeroPhase);

        return gameId;
    }

    /**
     * @notice Join an existing game (only during Round 1)
     * @param gameId The game to join
     */
    function joinGame(uint256 gameId) external payable {
        Game storage game = games[gameId];

        if (game.currentRound != 1) revert CanOnlyJoinRoundOne();
        if (game.state != GameState.CommitPhase) revert NotInCommitPhase();
        if (block.timestamp > game.commitDeadline) revert CommitDeadlinePassed();
        if (msg.value != game.entryFee) revert InvalidEntryFee();
        if (_hasJoined(game, msg.sender)) revert AlreadyJoined();

        game.prizePool += msg.value;
        game.totalPlayers++;
        game.players.push(msg.sender);

        emit PlayerJoined(gameId, msg.sender, msg.value, game.totalPlayers);
    }

    /**
     * @notice Set commit deadline and start commit phase
     * @param gameId The game ID
     * @param durationSeconds Duration in seconds from now
     */
    function setCommitDeadline(uint256 gameId, uint256 durationSeconds) external {
        Game storage game = games[gameId];

        if (game.state != GameState.ZeroPhase) revert NotInZeroPhase();
        if (durationSeconds == 0) revert InvalidDuration();
        if (msg.sender != game.creator) revert("Only creator can set deadlines");

        game.commitDeadline = block.timestamp + durationSeconds;
        game.state = GameState.CommitPhase;

        emit CommitPhaseStarted(gameId, game.currentRound, game.commitDeadline);
    }

    /**
     * @notice Submit vote commitment (keccak256 hash of vote + salt)
     * @param gameId The game ID
     * @param commitHash keccak256(abi.encodePacked(vote, salt))
     */
    function submitCommit(uint256 gameId, bytes32 commitHash) external {
        Game storage game = games[gameId];

        if (game.state != GameState.CommitPhase) revert NotInCommitPhase();
        if (block.timestamp > game.commitDeadline && game.commitDeadline != 0) {
            revert CommitDeadlinePassed();
        }
        if (game.hasCommitted[msg.sender]) revert AlreadyCommitted();

        // Check eligibility
        bool eligible = false;
        if (game.currentRound == 1) {
            eligible = _hasJoined(game, msg.sender);
        } else {
            eligible = _isRemainingPlayer(game, msg.sender);
        }
        if (!eligible) revert NotEligibleToVote();

        game.currentRoundCommits[msg.sender] = CommitRecord({
            commitHash: commitHash,
            timestamp: block.timestamp
        });
        game.hasCommitted[msg.sender] = true;

        emit VoteCommitted(gameId, game.currentRound, msg.sender, commitHash);
    }

    /**
     * @notice Set reveal deadline and transition to reveal phase
     * @param gameId The game ID
     * @param durationSeconds Duration in seconds from now
     */
    function setRevealDeadline(uint256 gameId, uint256 durationSeconds) external {
        Game storage game = games[gameId];

        if (game.state != GameState.CommitPhase) revert NotInCommitPhase();
        if (block.timestamp < game.commitDeadline) revert CommitDeadlineNotPassed();
        if (_getCommitCount(game) == 0) revert NoCommitsYet();
        if (durationSeconds == 0) revert InvalidDuration();
        if (msg.sender != game.creator) revert("Only creator can set deadlines");

        game.revealDeadline = block.timestamp + durationSeconds;
        game.state = GameState.RevealPhase;

        emit RevealPhaseStarted(gameId, game.currentRound, game.revealDeadline);
    }

    /**
     * @notice Reveal vote by providing original vote and salt
     * @param gameId The game ID
     * @param vote The original vote (true = yes, false = no)
     * @param salt The original salt used in commitment
     */
    function submitReveal(uint256 gameId, bool vote, bytes32 salt) external {
        Game storage game = games[gameId];

        if (game.state != GameState.RevealPhase) revert NotInRevealPhase();
        if (block.timestamp > game.revealDeadline && game.revealDeadline != 0) {
            revert RevealDeadlinePassed();
        }
        if (!game.hasCommitted[msg.sender]) revert NoCommitFound();
        if (game.hasRevealed[msg.sender]) revert AlreadyRevealed();

        // Verify reveal matches commitment
        bytes32 calculatedHash = keccak256(abi.encodePacked(vote, salt));
        if (calculatedHash != game.currentRoundCommits[msg.sender].commitHash) {
            revert InvalidReveal();
        }

        // Store reveal
        game.currentRoundReveals[msg.sender] = RevealRecord({
            vote: vote,
            salt: salt,
            timestamp: block.timestamp
        });
        game.hasRevealed[msg.sender] = true;

        // Update vote counts
        if (vote) {
            game.currentRoundYesVotes++;
        } else {
            game.currentRoundNoVotes++;
        }

        emit VoteRevealed(gameId, game.currentRound, msg.sender, vote);
    }

    /**
     * @notice Process the current round and determine winners/losers
     * @param gameId The game ID
     */
    function processRound(uint256 gameId) external {
        Game storage game = games[gameId];

        if (game.state != GameState.RevealPhase) revert NotInRevealPhaseForProcessing();

        // Check if all players revealed or deadline passed
        uint256 expectedReveals = game.currentRound == 1
            ? game.players.length
            : game.remainingPlayers.length;

        uint256 actualReveals = _getRevealCount(game);

        if (actualReveals < expectedReveals && block.timestamp <= game.revealDeadline) {
            revert DeadlineNotPassedOrNotAllRevealed();
        }

        // Handle first round with ≤2 players
        if (game.currentRound == 1 && (game.currentRoundYesVotes + game.currentRoundNoVotes) <= 2) {
            _handleFirstRoundAutoWin(game);
            return;
        }

        // Determine minority vote
        bool minorityVote = game.currentRoundYesVotes <= game.currentRoundNoVotes;
        uint32 votesRemaining = minorityVote ? game.currentRoundYesVotes : game.currentRoundNoVotes;

        game.roundResults[game.currentRound] = minorityVote;

        emit RoundCompleted(
            gameId,
            game.currentRound,
            game.currentRoundYesVotes,
            game.currentRoundNoVotes,
            minorityVote,
            votesRemaining
        );

        // Update remaining players
        _updateRemainingPlayers(game, minorityVote);

        // Check if game should end
        if (votesRemaining <= 2) {
            _endGame(game);
        } else {
            _startNextRound(game);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get comprehensive game information
     */
    function getGameInfo(uint256 gameId) external view returns (
        uint256 id,
        string memory questionText,
        uint256 entryFee,
        address creator,
        GameState state,
        uint8 currentRound,
        uint32 totalPlayers,
        uint32 currentYesVotes,
        uint32 currentNoVotes,
        uint256 prizePool,
        uint256 commitDeadline,
        uint256 revealDeadline,
        address[] memory players,
        address[] memory remainingPlayers,
        address[] memory winners
    ) {
        Game storage game = games[gameId];
        return (
            game.gameId,
            game.questionText,
            game.entryFee,
            game.creator,
            game.state,
            game.currentRound,
            game.totalPlayers,
            game.currentRoundYesVotes,
            game.currentRoundNoVotes,
            game.prizePool,
            game.commitDeadline,
            game.revealDeadline,
            game.players,
            game.remainingPlayers,
            game.winners
        );
    }

    /**
     * @notice Check if player has joined a game
     */
    function hasPlayerJoined(uint256 gameId, address player) external view returns (bool) {
        return _hasJoined(games[gameId], player);
    }

    // ============ Internal Functions ============

    function _hasJoined(Game storage game, address player) internal view returns (bool) {
        for (uint256 i = 0; i < game.players.length; i++) {
            if (game.players[i] == player) return true;
        }
        return false;
    }

    function _isRemainingPlayer(Game storage game, address player) internal view returns (bool) {
        for (uint256 i = 0; i < game.remainingPlayers.length; i++) {
            if (game.remainingPlayers[i] == player) return true;
        }
        return false;
    }

    function _getCommitCount(Game storage game) internal view returns (uint256) {
        uint256 count = 0;
        address[] memory playerList = game.currentRound == 1
            ? game.players
            : game.remainingPlayers;

        for (uint256 i = 0; i < playerList.length; i++) {
            if (game.hasCommitted[playerList[i]]) count++;
        }
        return count;
    }

    function _getRevealCount(Game storage game) internal view returns (uint256) {
        uint256 count = 0;
        address[] memory playerList = game.currentRound == 1
            ? game.players
            : game.remainingPlayers;

        for (uint256 i = 0; i < playerList.length; i++) {
            if (game.hasRevealed[playerList[i]]) count++;
        }
        return count;
    }

    function _handleFirstRoundAutoWin(Game storage game) internal {
        // With ≤2 players in round 1, all who revealed win
        address[] memory playerList = game.players;

        for (uint256 i = 0; i < playerList.length; i++) {
            if (game.hasRevealed[playerList[i]]) {
                game.winners.push(playerList[i]);
            }
        }

        emit RoundCompleted(
            game.gameId,
            game.currentRound,
            game.currentRoundYesVotes,
            game.currentRoundNoVotes,
            true,
            0
        );

        _endGame(game);
    }

    function _updateRemainingPlayers(Game storage game, bool minorityVote) internal {
        delete game.remainingPlayers;

        address[] memory playerList = game.currentRound == 1
            ? game.players
            : game.remainingPlayers;

        for (uint256 i = 0; i < playerList.length; i++) {
            address player = playerList[i];
            if (game.hasRevealed[player]) {
                if (game.currentRoundReveals[player].vote == minorityVote) {
                    game.remainingPlayers.push(player);
                }
            }
        }
    }

    function _startNextRound(Game storage game) internal {
        game.currentRound++;
        game.currentRoundYesVotes = 0;
        game.currentRoundNoVotes = 0;
        game.commitDeadline = 0;
        game.revealDeadline = 0;

        // Clear commit/reveal tracking
        address[] memory players = game.remainingPlayers;
        for (uint256 i = 0; i < players.length; i++) {
            delete game.currentRoundCommits[players[i]];
            delete game.currentRoundReveals[players[i]];
            game.hasCommitted[players[i]] = false;
            game.hasRevealed[players[i]] = false;
        }

        game.state = GameState.ZeroPhase;
    }

    function _endGame(Game storage game) internal {
        game.state = GameState.Completed;

        // Only set winners from remainingPlayers if not already set
        if (game.winners.length == 0) {
            game.winners = game.remainingPlayers;
        }

        uint256 totalPrize = game.prizePool;
        uint256 platformFee = 0;

        if (totalPrize > 0) {
            // Calculate 2% platform fee
            platformFee = (totalPrize * PLATFORM_FEE_PERCENTAGE) / 100;

            // Send platform fee
            (bool success, ) = platformFeeRecipient.call{value: platformFee}("");
            if (!success) revert TransferFailed();

            uint256 remainingPrize = totalPrize - platformFee;

            // Distribute to winners
            if (game.winners.length > 0) {
                uint256 prizePerWinner = remainingPrize / game.winners.length;

                for (uint256 i = 0; i < game.winners.length; i++) {
                    (bool winnerSuccess, ) = game.winners[i].call{value: prizePerWinner}("");
                    if (!winnerSuccess) revert TransferFailed();
                }

                emit GameCompleted(
                    game.gameId,
                    game.currentRound,
                    remainingPrize,
                    platformFee,
                    game.winners,
                    prizePerWinner
                );
            } else {
                // No winners - platform gets remaining prize
                (bool noWinnerSuccess, ) = platformFeeRecipient.call{value: remainingPrize}("");
                if (!noWinnerSuccess) revert TransferFailed();

                emit GameCompleted(
                    game.gameId,
                    game.currentRound,
                    0,
                    platformFee + remainingPrize,
                    game.winners,
                    0
                );
            }

            game.prizePool = 0;
        }
    }
}
