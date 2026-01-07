const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
const { logger } = require('../utils/logger');
const { GameEventProcessor } = require('../processors/gameEventProcessor');
const { GAME_STATES } = require('../database/types');
const { systemMonitor } = require('../utils/monitoring');

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
    
    // Connection monitoring
    this.lastEventReceived = Date.now();
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
    this.maxRetryDelay = 30000; // Max 30 seconds
    this.healthCheckInterval = null;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
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
    this.lastEventReceived = Date.now();
    logger.info(`Starting Flow event listener for contract: ${this.contractAddress}`);

    try {
      await this._connectWithRetry();
    } catch (error) {
      logger.error('Failed to start event listener after all retries:', error);
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Connect with exponential backoff retry logic
   */
  async _connectWithRetry() {
    try {
      await this._establishConnection();
      this.connectionRetries = 0; // Reset on successful connection
      this._startHealthCheck();
      this._startHeartbeat();
      logger.info('Flow event listener connected successfully');
    } catch (error) {
      logger.error(`Connection attempt ${this.connectionRetries + 1} failed:`, error);
      
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        const delay = Math.min(this.retryDelay * Math.pow(2, this.connectionRetries), this.maxRetryDelay);
        
        logger.info(`Retrying connection in ${delay}ms... (${this.connectionRetries}/${this.maxRetries})`);
        
        this.reconnectTimeout = setTimeout(() => {
          this._connectWithRetry();
        }, delay);
      } else {
        throw new Error(`Failed to connect after ${this.maxRetries} attempts`);
      }
    }
  }

  /**
   * Establish the actual FCL event subscription
   */
  async _establishConnection() {
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
          this.lastEventReceived = Date.now(); // Update activity timestamp
          await this.handleEvent(event);
        },
        (error) => {
          logger.error('Flow event subscription error:', error);
          this._handleConnectionError(error);
        }
      );

      logger.info(`Flow event listener started successfully for ${eventTypes.length} event types`);
  }

  /**
   * Handle connection errors and attempt reconnection
   */
  _handleConnectionError(error) {
    logger.warn('Connection error detected, attempting reconnection...');
    this.isListening = false;
    
    if (this.unsubscribeFunction) {
      try {
        this.unsubscribeFunction();
      } catch (e) {
        logger.error('Error during cleanup:', e);
      }
      this.unsubscribeFunction = null;
    }
    
    // Clear health check and heartbeat
    this._stopHealthCheck();
    this._stopHeartbeat();
    
    // Restart connection with retry logic
    setTimeout(() => {
      if (!this.isListening) {
        logger.info('Restarting event listener...');
        this.startListening().catch(err => {
          logger.error('Failed to restart event listener:', err);
        });
      }
    }, this.retryDelay);
  }

  /**
   * Start periodic health checks
   */
  _startHealthCheck() {
    this._stopHealthCheck(); // Clear any existing interval
    
    this.healthCheckInterval = setInterval(() => {
      this._performHealthCheck();
    }, 60000); // Check every minute
    
    logger.info('Health check monitoring started');
  }

  /**
   * Perform health check to ensure connection is alive
   */
  async _performHealthCheck() {
    const now = Date.now();
    const timeSinceLastEvent = now - this.lastEventReceived;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in ms
    
    logger.info(`Health check: Last event received ${Math.round(timeSinceLastEvent / 1000)}s ago`);
    
    // If no events received for 5 minutes, perform a Flow node ping
    if (timeSinceLastEvent > fiveMinutes) {
      logger.warn('No events received for 5 minutes, checking Flow node connection...');
      
      try {
        // Simple Flow node health check - get latest block
        const latestBlock = await fcl.send([fcl.getLatestBlock()]);
        const block = await fcl.decode(latestBlock);
        
        if (block && block.id) {
          logger.info(`Flow node healthy - Latest block: ${block.height}`);
          // Update activity to prevent unnecessary reconnections
          this.lastEventReceived = now - (3 * 60 * 1000); // Reset to 3 minutes ago
        } else {
          throw new Error('Invalid block response');
        }
      } catch (error) {
        logger.error('Flow node health check failed:', error);
        this._handleConnectionError(error);
      }
    }
  }

  /**
   * Stop health check monitoring
   */
  _stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health check monitoring stopped');
    }
  }

  /**
   * Start periodic heartbeat to keep Flow connection active
   */
  _startHeartbeat() {
    this._stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      this._sendHeartbeat();
    }, 30000); // Send heartbeat every 30 seconds
    
    logger.info('Flow node heartbeat started');
  }

  /**
   * Send heartbeat to Flow node
   */
  async _sendHeartbeat() {
    try {
      // Light-weight ping to Flow node - just get chain ID
      const response = await fcl.send([fcl.getAccount('0x0000000000000001')]);
      const account = await fcl.decode(response);
      
      if (account) {
        logger.debug('Flow heartbeat successful');
      } else {
        logger.warn('Flow heartbeat returned empty response');
      }
    } catch (error) {
      logger.warn('Flow heartbeat failed:', error.message);
      // Don't trigger reconnection for heartbeat failures, let health check handle it
    }
  }

  /**
   * Stop heartbeat monitoring
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('Flow heartbeat stopped');
    }
  }

  /**
   * Handle all events and route to appropriate processors
   * @param {Object} event - Flow event object
   */
  async handleEvent(event) {
    let success = false;
    try {
      // Extract event name from event type (e.g., "GameCreated" from "A.0x01.MinorityRuleGame.GameCreated")
      const eventName = event.type.split('.').pop();
      
      logger.info(`==== ${eventName} EVENT DETECTED ====`);
      logger.info('Event type:', event.type);
      logger.info('Full event structure:', JSON.stringify(event, null, 2));
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
          await this.handleGameStarted(event);
          break;
        case 'VoteCommitted':
          await this.handleVoteCommitted(event);
          break;
        case 'VoteRevealed':
          await this.handleVoteRevealed(event);
          break;
        case 'CommitPhaseStarted':
          await this.handleCommitPhaseStarted(event);
          break;
        case 'RevealPhaseStarted':
          await this.handleRevealPhaseStarted(event);
          break;
        case 'NewRoundStarted':
          await this.handleNewRoundStarted(event);
          break;
        case 'CommitDeadlineSet':
          await this.handleCommitDeadlineSet(event.data);
          break;
        case 'RevealDeadlineSet':
          await this.handleRevealDeadlineSet(event);
          break;
        case 'InvalidReveal':
          await this.handleInvalidReveal(event);
          break;
        case 'RoundCompleted':
          await this.handleRoundCompleted(event.data);
          break;
        case 'GameCompleted':
          await this.handleGameCompleted(event.data);
          break;
        case 'PrizeDistributed':
          await this.handlePrizeDistributed(event);
          break;
        default:
          logger.warn(`Unknown event type: ${eventName}`);
      }
      
      success = true;
      logger.info(`Successfully processed ${event.type.split('.').pop()} event`);
    } catch (error) {
      success = false;
      logger.error(`Error handling event ${event.type}:`, error);
    } finally {
      // Record event processing metrics
      systemMonitor.recordEvent(success);
    }
  }

  /**
   * Handle GameCreated event
   * @param {Object} event 
   */
  async handleGameCreated(event) {
    try {
      logger.info('Processing GameCreated event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('GameCreated: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly (FCL structure varies)
      const eventData = event.data || event;
      logger.info('Processing GameCreated event with data:', eventData);
      
      await this.processor.processGameCreated(eventData);
    } catch (error) {
      logger.error('Error processing GameCreated event:', error);
    }
  }

  /**
   * Handle PlayerJoined event
   * @param {Object} event - Flow event data
   */
  async handlePlayerJoined(event) {
    try {
      logger.info('Processing PlayerJoined event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('PlayerJoined: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly
      const eventData = event.data || event;
      logger.info('Processing PlayerJoined event with data:', eventData);
      
      await this.processor.processPlayerJoined(eventData);
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
      logger.info('Processing VoteCommitted event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('VoteCommitted: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly
      const eventData = event.data || event;
      logger.info('Processing VoteCommitted event with data:', eventData);
      
      await this.processor.processVoteCommitted(eventData);
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
      logger.info('Processing VoteRevealed event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('VoteRevealed: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly
      const eventData = event.data || event;
      logger.info('Processing VoteRevealed event with data:', eventData);
      
      await this.processor.processVoteRevealed(eventData);
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
      logger.info('Processing GameCompleted event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('GameCompleted: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly
      const eventData = event.data || event;
      logger.info('Processing GameCompleted event with data:', eventData);
      
      await this.processor.processGameCompleted(eventData);
    } catch (error) {
      logger.error('Error processing GameCompleted event:', error);
    }
  }

  /**
   * Handle GameStarted event
   * @param {Object} event - Flow event object
   */
  async handleGameStarted(event) {
    try {
      logger.info('Processing GameStarted event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('GameStarted: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly
      const eventData = event.data || event;
      logger.info('Processing GameStarted event with data:', eventData);
      
      // Defensive checks for required properties
      if (!eventData.gameId) {
        logger.error('GameStarted: missing required gameId', eventData);
        return;
      }

      // Update game state when game officially starts
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          total_players: parseInt(eventData.totalPlayers || game.total_players || 1)
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
   * @param {Object} event - Flow event object
   */
  async handleCommitPhaseStarted(event) {
    try {
      logger.info('Processing CommitPhaseStarted event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('CommitPhaseStarted: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly
      const eventData = event.data || event;
      logger.info('Processing CommitPhaseStarted event with data:', eventData);
      
      if (!eventData.gameId) {
        logger.error('CommitPhaseStarted: missing required gameId', eventData);
        return;
      }

      // Update game state to commit phase
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          current_round: parseInt(eventData.round || game.current_round || 1),
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
   * @param {Object} event - Flow event object
   */
  async handleRevealPhaseStarted(event) {
    try {
      logger.info('Processing RevealPhaseStarted event, raw event:', JSON.stringify(event, null, 2));
      
      if (!event || (!event.data && !event.gameId)) {
        logger.error('RevealPhaseStarted: Invalid event structure');
        return;
      }

      const eventData = event.data || event;
      
      if (!eventData.gameId) {
        logger.error('RevealPhaseStarted: missing gameId', eventData);
        return;
      }

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
   * @param {Object} event - Flow event object
   */
  async handleNewRoundStarted(event) {
    try {
      logger.info('Processing NewRoundStarted event, raw event:', JSON.stringify(event, null, 2));
      
      if (!event || (!event.data && !event.gameId)) {
        logger.error('NewRoundStarted: Invalid event structure');
        return;
      }

      const eventData = event.data || event;
      
      if (!eventData.gameId) {
        logger.error('NewRoundStarted: missing gameId', eventData);
        return;
      }

      // Update game's current round
      const { data: game } = await this.dbClient.getGame(parseInt(eventData.gameId));
      if (game) {
        const updatedGame = {
          ...game,
          current_round: parseInt(eventData.round || game.current_round + 1),
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
   * @param {Object} event - Flow event object
   */
  async handleCommitDeadlineSet(eventData) {
    try {
      logger.info('Processing CommitDeadlineSet event, raw event:', JSON.stringify(eventData, null, 2));
      
      // Check if event data exists
      if (!eventData || !eventData.gameId) {
        logger.error('CommitDeadlineSet: Invalid event structure - no data found');
        return;
      }

      logger.info('Processing CommitDeadlineSet event with data:', eventData);
      
      await this.processor.processCommitDeadlineSet(eventData);
    } catch (error) {
      logger.error('Error processing CommitDeadlineSet event:', error);
    }
  }

  /**
   * Handle RevealDeadlineSet event
   * @param {Object} event - Flow event object
   */
  async handleRevealDeadlineSet(event) {
    try {
      logger.info('Processing RevealDeadlineSet event, raw event:', JSON.stringify(event, null, 2));
      
      if (!event || (!event.data && !event.gameId)) {
        logger.error('RevealDeadlineSet: Invalid event structure');
        return;
      }

      const eventData = event.data || event;
      
      if (!eventData.gameId || !eventData.deadline) {
        logger.error('RevealDeadlineSet: missing required properties', eventData);
        return;
      }

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
   * @param {Object} event - Flow event object
   */
  async handleInvalidReveal(event) {
    try {
      logger.info('Processing InvalidReveal event, raw event:', JSON.stringify(event, null, 2));
      
      if (!event || (!event.data && !event.gameId)) {
        logger.error('InvalidReveal: Invalid event structure');
        return;
      }

      const eventData = event.data || event;
      
      // Log invalid reveal - may want to track this for statistics
      logger.warn(`Invalid reveal detected for player ${eventData.player} in game ${eventData.gameId} round ${eventData.round}`);
    } catch (error) {
      logger.error('Error processing InvalidReveal event:', error);
    }
  }

  /**
   * Handle RoundCompleted event (replaces RoundProcessed)
   * @param {Object} event - Flow event object
   */
  async handleRoundCompleted(event) {
    try {
      logger.info('Processing RoundCompleted event, raw event:', JSON.stringify(event, null, 2));
      
      // Check if event data exists
      if (!event || (!event.data && !event.gameId)) {
        logger.error('RoundCompleted: Invalid event structure - no data found');
        return;
      }

      // Use event.data if it exists, otherwise use event directly
      const eventData = event.data || event;
      logger.info('Processing RoundCompleted event with data:', eventData);
      
      await this.processor.processRoundProcessed(eventData);
    } catch (error) {
      logger.error('Error processing RoundCompleted event:', error);
    }
  }

  /**
   * Handle PrizeDistributed event
   * @param {Object} event - Flow event object
   */
  async handlePrizeDistributed(event) {
    try {
      logger.info('Processing PrizeDistributed event, raw event:', JSON.stringify(event, null, 2));
      
      if (!event || (!event.data && !event.gameId)) {
        logger.error('PrizeDistributed: Invalid event structure');
        return;
      }

      const eventData = event.data || event;
      
      if (!eventData.gameId || !eventData.winner || !eventData.amount) {
        logger.error('PrizeDistributed: missing required properties', eventData);
        return;
      }

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
    
    // Clean up monitoring
    this._stopHealthCheck();
    this._stopHeartbeat();
    
    // Clear timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
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