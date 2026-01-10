const { GAME_STATES, PLAYER_STATUS } = require('../database/types');
const { logger } = require('../utils/logger');

class GameEventProcessor {
  constructor(dbClient, websocket = null) {
    this.dbClient = dbClient;
    this.websocket = websocket; // { broadcastToGame, broadcastToAll }
  }

  /**
   * Process PlayerJoined event
   * @param {Object} eventData - Flow event data
   */
  async processPlayerJoined(eventData) {
    try {
      // Add defensive checks
      if (!eventData) {
        logger.error('PlayerJoined event: eventData is null or undefined');
        return;
      }

      logger.info('PlayerJoined eventData structure:', JSON.stringify(eventData, null, 2));

      // Check required properties
      if (!eventData.gameId || !eventData.player) {
        logger.error('PlayerJoined event: missing required properties', eventData);
        return;
      }

      const playerData = {
        game_id: parseInt(eventData.gameId),
        player_address: eventData.player, // Fixed: contract emits 'player', not 'playerAddress'
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
      if (eventData.player) {
        await this.dbClient.updatePlayerStats(eventData.player, { total_games: 1 });
      }

      // Broadcast WebSocket update for player joined
      if (this.websocket && this.websocket.broadcastToGame) {
        this.websocket.broadcastToGame(parseInt(eventData.gameId), {
          type: 'player-action',
          action: 'joined',
          playerAddress: eventData.player,
          newPlayerCount: (game?.total_players || 0) + 1,
          gameData: game ? {
            ...game,
            total_players: (game.total_players || 0) + 1,
            updated_at: new Date().toISOString()
          } : null
        });
      }

      logger.info(`Player ${eventData.player} joined game ${eventData.gameId}`);
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
      // Add defensive checks
      if (!eventData) {
        logger.error('VoteCommitted event: eventData is null or undefined');
        return;
      }

      logger.info('VoteCommitted eventData structure:', JSON.stringify(eventData, null, 2));

      // Check required properties
      if (!eventData.gameId || !eventData.player || !eventData.round || !eventData.commitHash) {
        logger.error('VoteCommitted event: missing required properties', eventData);
        return;
      }

      const commitData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        player_address: eventData.player,
        commit_hash: eventData.commitHash,
        committed_at: new Date().toISOString(),
        round_id: null // Will be set when round is processed
      };

      const { error } = await this.dbClient.upsertCommit(commitData);
      if (error) {
        logger.error('Failed to insert commit:', error);
        return;
      }

      // Broadcast WebSocket update for vote committed
      if (this.websocket && this.websocket.broadcastToGame) {
        this.websocket.broadcastToGame(parseInt(eventData.gameId), {
          type: 'player-action',
          action: 'committed',
          playerAddress: eventData.player,
          round: parseInt(eventData.round)
        });
      }

      logger.info(`Vote committed for player ${eventData.player} in game ${eventData.gameId} round ${eventData.round}`);
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
      // Add defensive checks
      if (!eventData) {
        logger.error('VoteRevealed event: eventData is null or undefined');
        return;
      }

      logger.info('VoteRevealed eventData structure:', JSON.stringify(eventData, null, 2));

      // Check required properties
      if (!eventData.gameId || !eventData.player || !eventData.round || !eventData.salt) {
        logger.error('VoteRevealed event: missing required properties', eventData);
        return;
      }

      const revealData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        player_address: eventData.player, // Fixed: contract emits 'player', not 'playerAddress'
        vote_value: eventData.vote === 'YES' || eventData.vote === true,
        salt: eventData.salt, // Extract salt from VoteRevealed event
        revealed_at: new Date().toISOString(),
        round_id: null // Will be set when round is processed
      };

      const { error } = await this.dbClient.upsertReveal(revealData);
      if (error) {
        logger.error('Failed to insert reveal:', error);
        return;
      }

      // Broadcast WebSocket update for vote revealed
      if (this.websocket && this.websocket.broadcastToGame) {
        this.websocket.broadcastToGame(parseInt(eventData.gameId), {
          type: 'player-action',
          action: 'revealed',
          playerAddress: eventData.player,
          round: parseInt(eventData.round),
          vote: eventData.vote === 'YES' || eventData.vote === true
        });
      }

      logger.info(`Vote revealed for player ${eventData.player} in game ${eventData.gameId} round ${eventData.round}: ${eventData.vote}`);
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
      // Add defensive checks
      if (!eventData) {
        logger.error('RoundProcessed event: eventData is null or undefined');
        return;
      }

      logger.info('RoundProcessed eventData structure:', JSON.stringify(eventData, null, 2));

      // Check required properties
      if (!eventData.gameId || !eventData.round) {
        logger.error('RoundProcessed event: missing required properties', eventData);
        return;
      }

      const roundData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        yes_count: parseInt(eventData.yesCount || 0), // Fixed: contract emits 'yesCount', not 'yesVotes'
        no_count: parseInt(eventData.noCount || 0),   // Fixed: contract emits 'noCount', not 'noVotes'
        minority_vote: eventData.minorityVote === 'YES' || eventData.minorityVote === true,
        votes_remaining: parseInt(eventData.votesRemaining || 0), // Fixed: contract emits 'votesRemaining', not 'playersRemaining'
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

        // Broadcast WebSocket update for round processed
        if (this.websocket && this.websocket.broadcastToGame) {
          this.websocket.broadcastToGame(parseInt(eventData.gameId), {
            type: 'round-completed',
            round: parseInt(eventData.round),
            results: {
              yesCount: parseInt(eventData.yesCount || 0),
              noCount: parseInt(eventData.noCount || 0),
              minority: eventData.minorityVote === 'YES' || eventData.minorityVote === true,
              playersRemaining: parseInt(eventData.votesRemaining || 0)
            },
            gameData: updatedGame
          });
        }
      }

      // Update commits and reveals with round_id
      if (round && round.id) {
        // This would require additional database operations to update existing records
        // For now, we'll handle this in a separate migration if needed
      }

      logger.info(`Round ${eventData.round} processed for game ${eventData.gameId}: ${eventData.yesCount} YES, ${eventData.noCount} NO, minority: ${eventData.minorityVote}`);
    } catch (error) {
      logger.error('Error processing RoundProcessed event:', error);
    }
  }

  /**
   * Process CommitDeadlineSet event
   * @param {Object} eventData - Flow event data
   */
  async processCommitDeadlineSet(eventData) {
    try {
      // Add defensive checks
      if (!eventData) {
        logger.error('CommitDeadlineSet event: eventData is null or undefined');
        return;
      }

      logger.info('CommitDeadlineSet eventData structure:', JSON.stringify(eventData, null, 2));

      // Check required properties
      if (!eventData.gameId || !eventData.deadline) {
        logger.error('CommitDeadlineSet event: missing required properties', eventData);
        return;
      }

      // Update commit deadline in game
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          game_state: GAME_STATES.COMMIT_PHASE,
          commit_deadline: new Date(parseFloat(eventData.deadline) * 1000).toISOString(),
          current_round: parseInt(eventData.round || game.current_round || 1)
        };

        await this.dbClient.upsertGame(updatedGame);

        // Broadcast WebSocket update
        if (this.websocket && this.websocket.broadcastToGame) {
          this.websocket.broadcastToGame(parseInt(eventData.gameId), {
            type: 'game-update',
            event: 'CommitDeadlineSet',
            data: updatedGame
          });
        }
      }

      logger.info(`Commit deadline set for game ${eventData.gameId} round ${eventData.round}: ${eventData.deadline}`);
    } catch (error) {
      logger.error('Error processing CommitDeadlineSet event:', error);
    }
  }

  /**
   * Process RevealDeadlineSet event
   * @param {Object} eventData - Flow event data
   */
  async processRevealDeadlineSet(eventData) {
    try {
      // Add defensive checks
      if (!eventData) {
        logger.error('RevealDeadlineSet event: eventData is null or undefined');
        return;
      }

      logger.info('RevealDeadlineSet eventData structure:', JSON.stringify(eventData, null, 2));

      // Check required properties
      if (!eventData.gameId || !eventData.deadline) {
        logger.error('RevealDeadlineSet event: missing required properties', eventData);
        return;
      }

      // Update reveal deadline in game
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          game_state: GAME_STATES.REVEAL_PHASE,
          reveal_deadline: new Date(parseFloat(eventData.deadline) * 1000).toISOString(),
          current_round: parseInt(eventData.round || game.current_round || 1)
        };

        await this.dbClient.upsertGame(updatedGame);

        // Broadcast WebSocket update
        if (this.websocket && this.websocket.broadcastToGame) {
          this.websocket.broadcastToGame(parseInt(eventData.gameId), {
            type: 'game-update',
            event: 'RevealDeadlineSet',
            data: updatedGame
          });
        }
      }

      logger.info(`Reveal deadline set for game ${eventData.gameId} round ${eventData.round}: ${eventData.deadline}`);
    } catch (error) {
      logger.error('Error processing RevealDeadlineSet event:', error);
    }
  }

  /**
   * Process GameCompleted event
   * @param {Object} eventData - Flow event data
   */
  async processGameCompleted(eventData) {
    try {
      // Add defensive checks
      if (!eventData) {
        logger.error('GameCompleted event: eventData is null or undefined');
        return;
      }

      logger.info('GameCompleted eventData structure:', JSON.stringify(eventData, null, 2));

      // Check required properties
      if (!eventData.gameId) {
        logger.error('GameCompleted event: missing required properties', eventData);
        return;
      }

      // Update game state to completed
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      let updatedGame = null;
      if (game) {
        updatedGame = {
          ...game,
          game_state: GAME_STATES.COMPLETED
        };

        await this.dbClient.upsertGame(updatedGame);
      }

      // Process prize distributions - contract emits prizePerWinner, not prizes array
      if (eventData.winners && eventData.prizePerWinner) {
        const winners = Array.isArray(eventData.winners) ? eventData.winners : [eventData.winners];
        const prizePerWinner = parseFloat(eventData.prizePerWinner);

        for (let i = 0; i < winners.length; i++) {
          const prizeData = {
            game_id: parseInt(eventData.gameId),
            winner_address: winners[i],
            amount: prizePerWinner, // Fixed: using prizePerWinner from contract
            distributed_at: new Date().toISOString()
          };

          await this.dbClient.insertPrizeDistribution(prizeData);

          // Update winner's stats
          await this.dbClient.updatePlayerStats(winners[i], {
            total_wins: 1,
            total_earnings: prizePerWinner
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

      // Broadcast WebSocket update for game completed
      if (this.websocket && this.websocket.broadcastToGame) {
        const winners = Array.isArray(eventData.winners) ? eventData.winners : [eventData.winners];
        const prizePerWinner = parseFloat(eventData.prizePerWinner);
        
        this.websocket.broadcastToGame(parseInt(eventData.gameId), {
          type: 'game-completed',
          winners: winners || [],
          prizePerWinner: prizePerWinner || 0,
          gameData: updatedGame
        });
      }

      logger.info(`Game ${eventData.gameId} completed with ${eventData.winners?.length || 1} winner(s)`);
    } catch (error) {
      logger.error('Error processing GameCompleted event:', error);
    }
  }
}

module.exports = { GameEventProcessor };