const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
const { logger } = require('../utils/logger');
const { GameEventProcessor } = require('../processors/gameEventProcessor');

// Configure Flow client
fcl.config({
  'accessNode.api': process.env.FLOW_ACCESS_NODE || 'http://localhost:8888',
  'discovery.wallet': false
});

class FlowEventListener {
  constructor(dbClient) {
    this.dbClient = dbClient;
    this.processor = new GameEventProcessor(dbClient);
    this.isListening = false;
    this.contractAddress = process.env.FLOW_CONTRACT_ADDRESS || '0x01';
    this.unsubscribeFunction = null;
  }

  /**
   * Start listening for Flow events using single websocket connection
   */
  async startListening() {
    if (this.isListening) {
      logger.warn('Event listener is already running');
      return;
    }

    this.isListening = true;
    logger.info(`Starting Flow event listener for contract: ${this.contractAddress}`);

    try {
      // Define all event types we want to listen for (complete list from contract)
      const eventTypes = [
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.GameCreated`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.PlayerJoined`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.GameStarted`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.VoteCommitted`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.VoteRevealed`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.CommitPhaseStarted`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.RevealPhaseStarted`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.NewRoundStarted`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.CommitDeadlineSet`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.RevealDeadlineSet`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.InvalidReveal`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.RoundCompleted`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.GameCompleted`,
        `A.${this.contractAddress.replace('0x', '')}.MinorityRuleGame.PrizeDistributed`
      ];

      // Single websocket connection for all events
      this.unsubscribeFunction = fcl.events({
        eventTypes: eventTypes
      }).subscribe(
        async (event) => {
          await this.handleEvent(event);
        },
        (error) => {
          logger.error('Error listening for Flow events:', error);
        }
      );

      logger.info(`Flow event listener started successfully for ${eventTypes.length} event types`);
    } catch (error) {
      logger.error('Failed to start event listener:', error);
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Handle all events and route to appropriate processors
   * @param {Object} event - Flow event object
   */
  async handleEvent(event) {
    try {
      // Extract event name from event type (e.g., "GameCreated" from "A.0x01.MinorityRuleGame.GameCreated")
      const eventName = event.type.split('.').pop();
      
      logger.info(`==== ${eventName} EVENT DETECTED ====`);
      logger.info('Event type:', event.type);
      logger.info('Event data:', event.data);

      // Route to appropriate handler based on event name
      switch (eventName) {
        case 'GameCreated':
          await this.handleGameCreated(event.data);
          break;
        case 'PlayerJoined':
          await this.handlePlayerJoined(event.data);
          break;
        case 'GameStarted':
          await this.handleGameStarted(event.data);
          break;
        case 'VoteCommitted':
          await this.handleVoteCommitted(event.data);
          break;
        case 'VoteRevealed':
          await this.handleVoteRevealed(event.data);
          break;
        case 'CommitPhaseStarted':
          await this.handleCommitPhaseStarted(event.data);
          break;
        case 'RevealPhaseStarted':
          await this.handleRevealPhaseStarted(event.data);
          break;
        case 'NewRoundStarted':
          await this.handleNewRoundStarted(event.data);
          break;
        case 'CommitDeadlineSet':
          await this.handleCommitDeadlineSet(event.data);
          break;
        case 'RevealDeadlineSet':
          await this.handleRevealDeadlineSet(event.data);
          break;
        case 'InvalidReveal':
          await this.handleInvalidReveal(event.data);
          break;
        case 'RoundCompleted':
          await this.handleRoundCompleted(event.data);
          break;
        case 'GameCompleted':
          await this.handleGameCompleted(event.data);
          break;
        case 'PrizeDistributed':
          await this.handlePrizeDistributed(event.data);
          break;
        default:
          logger.warn(`Unknown event type: ${eventName}`);
      }
    } catch (error) {
      logger.error(`Error handling event ${event.type}:`, error);
    }
  }

  /**
   * Handle GameCreated event
   * @param {Object} event 
   */
  async handleGameCreated(event) {
    try {
      logger.info('Processing GameCreated event:', event.data);
      await this.processor.processGameCreated(event.data);
    } catch (error) {
      logger.error('Error processing GameCreated event:', error);
    }
  }

  /**
   * Handle PlayerJoined event
   * @param {Object} event 
   */
  async handlePlayerJoined(event) {
    try {
      logger.info('Processing PlayerJoined event:', event.data);
      await this.processor.processPlayerJoined(event.data);
    } catch (error) {
      logger.error('Error processing PlayerJoined event:', error);
    }
  }

  /**
   * Handle VoteCommitted event
   * @param {Object} event 
   */
  async handleVoteCommitted(event) {
    try {
      logger.info('Processing VoteCommitted event:', event.data);
      await this.processor.processVoteCommitted(event.data);
    } catch (error) {
      logger.error('Error processing VoteCommitted event:', error);
    }
  }

  /**
   * Handle VoteRevealed event
   * @param {Object} event 
   */
  async handleVoteRevealed(event) {
    try {
      logger.info('Processing VoteRevealed event:', event.data);
      await this.processor.processVoteRevealed(event.data);
    } catch (error) {
      logger.error('Error processing VoteRevealed event:', error);
    }
  }

  /**
   * Handle RoundProcessed event
   * @param {Object} event 
   */
  async handleRoundProcessed(event) {
    try {
      logger.info('Processing RoundProcessed event:', event.data);
      await this.processor.processRoundProcessed(event.data);
    } catch (error) {
      logger.error('Error processing RoundProcessed event:', error);
    }
  }

  /**
   * Handle GameCompleted event
   * @param {Object} event 
   */
  async handleGameCompleted(event) {
    try {
      logger.info('Processing GameCompleted event:', event.data);
      await this.processor.processGameCompleted(event.data);
    } catch (error) {
      logger.error('Error processing GameCompleted event:', error);
    }
  }

  /**
   * Handle GameStarted event
   * @param {Object} eventData - Flow event data
   */
  async handleGameStarted(eventData) {
    try {
      // Update game state when game officially starts
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          total_players: parseInt(eventData.totalPlayers)
        };
        await this.dbClient.upsertGame(updatedGame);
      }
      
      logger.info(`Game ${eventData.gameId} started with ${eventData.totalPlayers} players`);
    } catch (error) {
      logger.error('Error processing GameStarted event:', error);
    }
  }

  /**
   * Handle CommitPhaseStarted event
   * @param {Object} eventData - Flow event data
   */
  async handleCommitPhaseStarted(eventData) {
    try {
      // Update game state to commit phase
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          current_round: parseInt(eventData.round),
          game_state: GAME_STATES.COMMIT_PHASE
        };
        await this.dbClient.upsertGame(updatedGame);
      }
      
      logger.info(`Commit phase started for game ${eventData.gameId} round ${eventData.round}`);
    } catch (error) {
      logger.error('Error processing CommitPhaseStarted event:', error);
    }
  }

  /**
   * Handle RevealPhaseStarted event
   * @param {Object} eventData - Flow event data
   */
  async handleRevealPhaseStarted(eventData) {
    try {
      // Update game state to reveal phase
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          game_state: GAME_STATES.REVEAL_PHASE
        };
        await this.dbClient.upsertGame(updatedGame);
      }
      
      logger.info(`Reveal phase started for game ${eventData.gameId} round ${eventData.round}`);
    } catch (error) {
      logger.error('Error processing RevealPhaseStarted event:', error);
    }
  }

  /**
   * Handle NewRoundStarted event  
   * @param {Object} eventData - Flow event data
   */
  async handleNewRoundStarted(eventData) {
    try {
      // Update game's current round
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          current_round: parseInt(eventData.round),
          game_state: GAME_STATES.COMMIT_PHASE
        };
        await this.dbClient.upsertGame(updatedGame);
      }
      
      logger.info(`New round ${eventData.round} started for game ${eventData.gameId}`);
    } catch (error) {
      logger.error('Error processing NewRoundStarted event:', error);
    }
  }

  /**
   * Handle CommitDeadlineSet event
   * @param {Object} eventData - Flow event data
   */
  async handleCommitDeadlineSet(eventData) {
    try {
      // Update commit deadline in game
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          commit_deadline: new Date(parseFloat(eventData.deadline) * 1000).toISOString()
        };
        await this.dbClient.upsertGame(updatedGame);
      }
      
      logger.info(`Commit deadline set for game ${eventData.gameId} round ${eventData.round}: ${eventData.deadline}`);
    } catch (error) {
      logger.error('Error processing CommitDeadlineSet event:', error);
    }
  }

  /**
   * Handle RevealDeadlineSet event
   * @param {Object} eventData - Flow event data
   */
  async handleRevealDeadlineSet(eventData) {
    try {
      // Update reveal deadline in game
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          reveal_deadline: new Date(parseFloat(eventData.deadline) * 1000).toISOString()
        };
        await this.dbClient.upsertGame(updatedGame);
      }
      
      logger.info(`Reveal deadline set for game ${eventData.gameId} round ${eventData.round}: ${eventData.deadline}`);
    } catch (error) {
      logger.error('Error processing RevealDeadlineSet event:', error);
    }
  }

  /**
   * Handle InvalidReveal event
   * @param {Object} eventData - Flow event data
   */
  async handleInvalidReveal(eventData) {
    try {
      // Log invalid reveal - may want to track this for statistics
      logger.warn(`Invalid reveal detected for player ${eventData.player} in game ${eventData.gameId} round ${eventData.round}`);
    } catch (error) {
      logger.error('Error processing InvalidReveal event:', error);
    }
  }

  /**
   * Handle RoundCompleted event (replaces RoundProcessed)
   * @param {Object} eventData - Flow event data
   */
  async handleRoundCompleted(eventData) {
    try {
      const roundData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        yes_count: parseInt(eventData.yesCount),
        no_count: parseInt(eventData.noCount),
        minority_vote: eventData.minorityVote === 'YES' || eventData.minorityVote === true,
        votes_remaining: parseInt(eventData.votesRemaining),
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
          game_state: parseInt(eventData.votesRemaining) <= 2 ? 
            GAME_STATES.COMPLETED : GAME_STATES.COMMIT_PHASE
        };

        await this.dbClient.upsertGame(updatedGame);
      }

      logger.info(`Round ${eventData.round} completed for game ${eventData.gameId}: ${eventData.yesCount} YES, ${eventData.noCount} NO, minority: ${eventData.minorityVote}`);
    } catch (error) {
      logger.error('Error processing RoundCompleted event:', error);
    }
  }

  /**
   * Handle PrizeDistributed event
   * @param {Object} eventData - Flow event data
   */
  async handlePrizeDistributed(eventData) {
    try {
      const prizeData = {
        game_id: parseInt(eventData.gameId),
        winner_address: eventData.winner,
        amount: parseFloat(eventData.amount),
        distributed_at: new Date().toISOString()
      };

      await this.dbClient.insertPrizeDistribution(prizeData);
      
      logger.info(`Prize distributed: ${eventData.amount} FLOW to ${eventData.winner} for game ${eventData.gameId}`);
    } catch (error) {
      logger.error('Error processing PrizeDistributed event:', error);
    }
  }

  /**
   * Stop listening for events
   */
  stopListening() {
    if (this.unsubscribeFunction) {
      this.unsubscribeFunction();
      this.unsubscribeFunction = null;
    }
    this.isListening = false;
    logger.info('Flow event listener stopped');
  }
}

/**
 * Start the Flow event listener
 * @param {DatabaseClient} dbClient 
 */
async function startFlowEventListener(dbClient) {
  const listener = new FlowEventListener(dbClient);
  await listener.startListening();
  return listener;
}

module.exports = { 
  FlowEventListener, 
  startFlowEventListener 
};