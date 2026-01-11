// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {MinorityRuleGame} from "../src/MinorityRuleGame.sol";

contract MinorityRuleGameTest is Test {
    MinorityRuleGame public game;

    address public platformRecipient = makeAddr("platform");
    address public creator = makeAddr("creator");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    address public player3 = makeAddr("player3");
    address public player4 = makeAddr("player4");
    address public player5 = makeAddr("player5");

    uint256 public constant ENTRY_FEE = 1 ether;

    event GameCreated(
        uint256 indexed gameId,
        uint256 entryFee,
        address indexed creator,
        string questionText,
        MinorityRuleGame.GameState phase
    );

    event PlayerJoined(
        uint256 indexed gameId,
        address indexed player,
        uint256 amount,
        uint32 totalPlayers
    );

    function setUp() public {
        game = new MinorityRuleGame(platformRecipient);

        // Fund test accounts
        vm.deal(creator, 100 ether);
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(player3, 100 ether);
        vm.deal(player4, 100 ether);
        vm.deal(player5, 100 ether);
    }

    // ============ Helper Functions ============

    function createTestGame() internal returns (uint256) {
        vm.prank(creator);
        return game.createGame("Is the sky blue?", ENTRY_FEE);
    }

    function generateCommitHash(bool vote, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(vote, salt));
    }

    // ============ Create Game Tests ============

    function test_CreateGame() public {
        vm.prank(creator);

        vm.expectEmit(true, true, false, true);
        emit GameCreated(1, ENTRY_FEE, creator, "Is the sky blue?", MinorityRuleGame.GameState.ZeroPhase);

        uint256 gameId = game.createGame("Is the sky blue?", ENTRY_FEE);

        assertEq(gameId, 1);

        (
            uint256 id,
            string memory questionText,
            uint256 entryFee,
            address gameCreator,
            MinorityRuleGame.GameState state,
            uint8 currentRound,
            uint32 totalPlayers,
            ,,,,,
            address[] memory players,
            ,
        ) = game.getGameInfo(gameId);

        assertEq(id, 1);
        assertEq(questionText, "Is the sky blue?");
        assertEq(entryFee, ENTRY_FEE);
        assertEq(gameCreator, creator);
        assertTrue(state == MinorityRuleGame.GameState.ZeroPhase);
        assertEq(currentRound, 1);
        assertEq(totalPlayers, 0);
        assertEq(players.length, 0);
    }

    function testRevert_CreateGameZeroEntryFee() public {
        vm.prank(creator);
        vm.expectRevert("Entry fee must be greater than 0");
        game.createGame("Is the sky blue?", 0);
    }

    // ============ Set Commit Deadline Tests ============

    function test_SetCommitDeadline() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        (,,,, MinorityRuleGame.GameState state,,,,,,uint256 commitDeadline,,,,) = game.getGameInfo(gameId);

        assertTrue(state == MinorityRuleGame.GameState.CommitPhase);
        assertEq(commitDeadline, block.timestamp + 3600);
    }

    function testRevert_SetCommitDeadlineNotCreator() public {
        uint256 gameId = createTestGame();

        vm.prank(player1);
        vm.expectRevert("Only creator can set deadlines");
        game.setCommitDeadline(gameId, 3600);
    }

    // ============ Join Game Tests ============

    function test_JoinGame() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        vm.prank(player1);
        vm.expectEmit(true, true, false, true);
        emit PlayerJoined(gameId, player1, ENTRY_FEE, 1);

        game.joinGame{value: ENTRY_FEE}(gameId);

        (,,,,,, uint32 totalPlayers,,,,,,address[] memory players,,) = game.getGameInfo(gameId);

        assertEq(totalPlayers, 1);
        assertEq(players.length, 1);
        assertEq(players[0], player1);
    }

    function testRevert_JoinGameNotRoundOne() public {
        uint256 gameId = createTestGame();

        // Simulate being past round 1
        // (This would require processing a round first, simplified for now)
    }

    function testRevert_JoinGameAlreadyJoined() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        vm.prank(player1);
        game.joinGame{value: ENTRY_FEE}(gameId);

        vm.prank(player1);
        vm.expectRevert(MinorityRuleGame.AlreadyJoined.selector);
        game.joinGame{value: ENTRY_FEE}(gameId);
    }

    // ============ Commit-Reveal Tests ============

    function test_CommitVote() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        // Creator joins the game
        vm.prank(creator);
        game.joinGame{value: ENTRY_FEE}(gameId);

        bytes32 salt = keccak256("random_salt");
        bytes32 commitHash = generateCommitHash(true, salt);

        vm.prank(creator);
        game.submitCommit(gameId, commitHash);

        // Verify commit was recorded
        assertTrue(true); // If no revert, commit succeeded
    }

    function testRevert_CommitTwice() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        // Creator joins the game
        vm.prank(creator);
        game.joinGame{value: ENTRY_FEE}(gameId);

        bytes32 salt = keccak256("random_salt");
        bytes32 commitHash = generateCommitHash(true, salt);

        vm.prank(creator);
        game.submitCommit(gameId, commitHash);

        vm.prank(creator);
        vm.expectRevert(MinorityRuleGame.AlreadyCommitted.selector);
        game.submitCommit(gameId, commitHash);
    }

    function test_RevealVote() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        // Creator joins the game
        vm.prank(creator);
        game.joinGame{value: ENTRY_FEE}(gameId);

        bytes32 salt = keccak256("random_salt");
        bool vote = true;
        bytes32 commitHash = generateCommitHash(vote, salt);

        vm.prank(creator);
        game.submitCommit(gameId, commitHash);

        // Move time past commit deadline
        vm.warp(block.timestamp + 3601);

        vm.prank(creator);
        game.setRevealDeadline(gameId, 3600);

        vm.prank(creator);
        game.submitReveal(gameId, vote, salt);

        (,,,,,, ,uint32 yesVotes, uint32 noVotes,,,,,,) = game.getGameInfo(gameId);

        assertEq(yesVotes, 1);
        assertEq(noVotes, 0);
    }

    function testRevert_RevealWithWrongSalt() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        // Creator joins the game
        vm.prank(creator);
        game.joinGame{value: ENTRY_FEE}(gameId);

        bytes32 salt = keccak256("random_salt");
        bytes32 wrongSalt = keccak256("wrong_salt");
        bool vote = true;
        bytes32 commitHash = generateCommitHash(vote, salt);

        vm.prank(creator);
        game.submitCommit(gameId, commitHash);

        vm.warp(block.timestamp + 3601);

        vm.prank(creator);
        game.setRevealDeadline(gameId, 3600);

        vm.prank(creator);
        vm.expectRevert(MinorityRuleGame.InvalidReveal.selector);
        game.submitReveal(gameId, vote, wrongSalt);
    }

    // ============ Full Game Flow Test ============

    function test_FullGameFlowWithFivePlayers() public {
        uint256 gameId = createTestGame();

        // Set commit deadline
        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        // Creator and 4 players join (5 total)
        vm.prank(creator);
        game.joinGame{value: ENTRY_FEE}(gameId);

        vm.prank(player1);
        game.joinGame{value: ENTRY_FEE}(gameId);

        vm.prank(player2);
        game.joinGame{value: ENTRY_FEE}(gameId);

        vm.prank(player3);
        game.joinGame{value: ENTRY_FEE}(gameId);

        vm.prank(player4);
        game.joinGame{value: ENTRY_FEE}(gameId);

        // Generate salts
        bytes32 salt1 = keccak256("salt1");
        bytes32 salt2 = keccak256("salt2");
        bytes32 salt3 = keccak256("salt3");
        bytes32 salt4 = keccak256("salt4");
        bytes32 salt5 = keccak256("salt5");

        // Round 1: 2 vote yes, 3 vote no -> yes is minority
        vm.prank(creator);
        game.submitCommit(gameId, generateCommitHash(true, salt1));

        vm.prank(player1);
        game.submitCommit(gameId, generateCommitHash(true, salt2));

        vm.prank(player2);
        game.submitCommit(gameId, generateCommitHash(false, salt3));

        vm.prank(player3);
        game.submitCommit(gameId, generateCommitHash(false, salt4));

        vm.prank(player4);
        game.submitCommit(gameId, generateCommitHash(false, salt5));

        // Move past commit deadline
        vm.warp(block.timestamp + 3601);

        vm.prank(creator);
        game.setRevealDeadline(gameId, 3600);

        // Reveal all votes
        vm.prank(creator);
        game.submitReveal(gameId, true, salt1);

        vm.prank(player1);
        game.submitReveal(gameId, true, salt2);

        vm.prank(player2);
        game.submitReveal(gameId, false, salt3);

        vm.prank(player3);
        game.submitReveal(gameId, false, salt4);

        vm.prank(player4);
        game.submitReveal(gameId, false, salt5);

        // Move past reveal deadline
        vm.warp(block.timestamp + 3601);

        // Process round
        game.processRound(gameId);

        (,,,,,, ,,,,,, ,address[] memory remainingPlayers,) = game.getGameInfo(gameId);

        // Should have 2 remaining players (creator and player1 who voted yes)
        assertEq(remainingPlayers.length, 2);
        assertEq(remainingPlayers[0], creator);
        assertEq(remainingPlayers[1], player1);
    }

    function test_GameEndsWithTwoPlayers() public {
        uint256 gameId = createTestGame();

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        // Two players join
        vm.prank(creator);
        game.joinGame{value: ENTRY_FEE}(gameId);

        vm.prank(player1);
        game.joinGame{value: ENTRY_FEE}(gameId);

        bytes32 salt1 = keccak256("salt1");
        bytes32 salt2 = keccak256("salt2");

        vm.prank(creator);
        game.submitCommit(gameId, generateCommitHash(true, salt1));

        vm.prank(player1);
        game.submitCommit(gameId, generateCommitHash(false, salt2));

        vm.warp(block.timestamp + 3601);

        vm.prank(creator);
        game.setRevealDeadline(gameId, 3600);

        vm.prank(creator);
        game.submitReveal(gameId, true, salt1);

        vm.prank(player1);
        game.submitReveal(gameId, false, salt2);

        vm.warp(block.timestamp + 3601);

        uint256 platformBalanceBefore = platformRecipient.balance;
        uint256 creatorBalanceBefore = creator.balance;
        uint256 player1BalanceBefore = player1.balance;

        // Process round - game should end
        game.processRound(gameId);

        (,,,, MinorityRuleGame.GameState state,,,,,,,,,, address[] memory winners) = game.getGameInfo(gameId);

        assertTrue(state == MinorityRuleGame.GameState.Completed);
        assertEq(winners.length, 2);

        // Check payouts
        uint256 totalPrize = 2 ether;
        uint256 platformFee = (totalPrize * 2) / 100; // 2%
        uint256 remainingPrize = totalPrize - platformFee;
        uint256 prizePerWinner = remainingPrize / 2;

        assertEq(platformRecipient.balance - platformBalanceBefore, platformFee);
        assertEq(creator.balance - creatorBalanceBefore, prizePerWinner);
        assertEq(player1.balance - player1BalanceBefore, prizePerWinner);
    }

    // ============ View Function Tests ============

    function test_HasPlayerJoined() public {
        uint256 gameId = createTestGame();

        assertFalse(game.hasPlayerJoined(gameId, creator));
        assertFalse(game.hasPlayerJoined(gameId, player1));

        vm.prank(creator);
        game.setCommitDeadline(gameId, 3600);

        vm.prank(player1);
        game.joinGame{value: ENTRY_FEE}(gameId);

        assertTrue(game.hasPlayerJoined(gameId, player1));
    }
}
