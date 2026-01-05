const { GAME_STATES, PLAYER_STATUS } = require('../database/types');
const { logger } = require('../utils/logger');

class GameEventProcessor {
  constructor(dbClient) {
    this.dbClient = dbClient;
  }

  /**
   * Process GameCreated event
   * @param {Object} eventData - Flow event data
   */
  async processGameCreated(eventData) {
    try {
      const gameData = {
        game_id: parseInt(eventData.gameId),
        question_text: eventData.question,
        entry_fee: parseFloat(eventData.entryFee),
        creator_address: eventData.creator,
        current_round: 1,
        game_state: GAME_STATES.COMMIT_PHASE,
        commit_deadline: eventData.commitDeadline,
        reveal_deadline: null,
        total_players: 1, // Creator joins automatically
        created_at: new Date().toISOString()
      };

      const { data: game, error: gameError } = await this.dbClient.upsertGame(gameData);
      if (gameError) {
        logger.error('Failed to insert game:', gameError);
        return;
      }

      // Add creator as first player
      const playerData = {
        game_id: parseInt(eventData.gameId),
        player_address: eventData.creator,
        joined_at: new Date().toISOString(),
        status: PLAYER_STATUS.ACTIVE
      };

      const { error: playerError } = await this.dbClient.upsertGamePlayer(playerData);
      if (playerError) {
        logger.error('Failed to insert game creator as player:', playerError);
      }

      // Update creator's profile stats
      await this.dbClient.updatePlayerStats(eventData.creator, { total_games: 1 });

      logger.info(`Game ${eventData.gameId} created successfully`);
    } catch (error) {
      logger.error('Error processing GameCreated event:', error);
    }
  }

  /**
   * Process PlayerJoined event
   * @param {Object} eventData - Flow event data
   */
  async processPlayerJoined(eventData) {
    try {
      const playerData = {
        game_id: parseInt(eventData.gameId),
        player_address: eventData.playerAddress,
        joined_at: new Date().toISOString(),
        status: PLAYER_STATUS.ACTIVE
      };

      const { error: playerError } = await this.dbClient.upsertGamePlayer(playerData);
      if (playerError) {
        logger.error('Failed to insert player:', playerError);
        return;
      }

      // Update total players count in game
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          total_players: (game.total_players || 0) + 1,
          updated_at: new Date().toISOString()
        };

        await this.dbClient.upsertGame(updatedGame);
      }

      // Update player's profile stats  
      await this.dbClient.updatePlayerStats(eventData.playerAddress, { total_games: 1 });

      logger.info(`Player ${eventData.playerAddress} joined game ${eventData.gameId}`);
    } catch (error) {
      logger.error('Error processing PlayerJoined event:', error);
    }
  }

  /**
   * Process VoteCommitted event
   * @param {Object} eventData - Flow event data
   */
  async processVoteCommitted(eventData) {
    try {
      const commitData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        player_address: eventData.playerAddress,
        commit_hash: eventData.commitHash,
        committed_at: new Date().toISOString(),
        round_id: null // Will be set when round is processed
      };

      const { error } = await this.dbClient.upsertCommit(commitData);
      if (error) {
        logger.error('Failed to insert commit:', error);
        return;
      }

      logger.info(`Vote committed for player ${eventData.playerAddress} in game ${eventData.gameId} round ${eventData.round}`);
    } catch (error) {
      logger.error('Error processing VoteCommitted event:', error);
    }
  }

  /**
   * Process VoteRevealed event
   * @param {Object} eventData - Flow event data
   */
  async processVoteRevealed(eventData) {
    try {
      const revealData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        player_address: eventData.playerAddress,
        vote_value: eventData.vote === 'YES' || eventData.vote === true,
        salt: eventData.salt,
        revealed_at: new Date().toISOString(),
        round_id: null // Will be set when round is processed
      };

      const { error } = await this.dbClient.upsertReveal(revealData);
      if (error) {
        logger.error('Failed to insert reveal:', error);
        return;
      }

      logger.info(`Vote revealed for player ${eventData.playerAddress} in game ${eventData.gameId} round ${eventData.round}: ${eventData.vote}`);
    } catch (error) {
      logger.error('Error processing VoteRevealed event:', error);
    }
  }

  /**
   * Process RoundProcessed event
   * @param {Object} eventData - Flow event data
   */
  async processRoundProcessed(eventData) {
    try {
      const roundData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        yes_count: parseInt(eventData.yesVotes),
        no_count: parseInt(eventData.noVotes),
        minority_vote: eventData.minorityVote === 'YES' || eventData.minorityVote === true,
        votes_remaining: parseInt(eventData.playersRemaining),
        completed_at: new Date().toISOString()
      };

      const { data: round, error: roundError } = await this.dbClient.upsertRound(roundData);
      if (roundError) {
        logger.error('Failed to insert round:', roundError);
        return;
      }

      // Update game state and current round
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          current_round: parseInt(eventData.round) + 1,
          game_state: parseInt(eventData.playersRemaining) <= 2 ? 
            GAME_STATES.COMPLETED : GAME_STATES.COMMIT_PHASE
        };

        await this.dbClient.upsertGame(updatedGame);
      }

      // Update commits and reveals with round_id
      if (round && round.id) {
        // This would require additional database operations to update existing records
        // For now, we'll handle this in a separate migration if needed
      }

      logger.info(`Round ${eventData.round} processed for game ${eventData.gameId}: ${eventData.yesVotes} YES, ${eventData.noVotes} NO, minority: ${eventData.minorityVote}`);
    } catch (error) {
      logger.error('Error processing RoundProcessed event:', error);
    }
  }

  /**
   * Process GameCompleted event
   * @param {Object} eventData - Flow event data
   */
  async processGameCompleted(eventData) {
    try {
      // Update game state to completed
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          game_state: GAME_STATES.COMPLETED
        };

        await this.dbClient.upsertGame(updatedGame);
      }

      // Process prize distributions
      if (eventData.winners && eventData.prizes) {
        const winners = Array.isArray(eventData.winners) ? eventData.winners : [eventData.winners];
        const prizes = Array.isArray(eventData.prizes) ? eventData.prizes : [eventData.prizes];

        for (let i = 0; i < winners.length; i++) {
          const prizeData = {
            game_id: parseInt(eventData.gameId),
            winner_address: winners[i],
            amount: parseFloat(prizes[i] || prizes[0]),
            distributed_at: new Date().toISOString()
          };

          await this.dbClient.insertPrizeDistribution(prizeData);

          // Update winner's stats
          await this.dbClient.updatePlayerStats(winners[i], {
            total_wins: 1,
            total_earnings: parseFloat(prizes[i] || prizes[0])
          });

          // Update player status to winner
          const playerData = {
            game_id: parseInt(eventData.gameId),
            player_address: winners[i],
            status: PLAYER_STATUS.WINNER
          };

          await this.dbClient.upsertGamePlayer(playerData);
        }
      }

      logger.info(`Game ${eventData.gameId} completed with ${eventData.winners?.length || 1} winner(s)`);
    } catch (error) {
      logger.error('Error processing GameCompleted event:', error);
    }
  }
}

module.exports = { GameEventProcessor };