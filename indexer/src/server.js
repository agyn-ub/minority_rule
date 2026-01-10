const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const { DatabaseClient } = require('./database/client');
const { startFlowEventListener } = require('./flow/eventListener');
const { logger } = require('./utils/logger');
const { systemMonitor } = require('./utils/monitoring');

const app = express();
const port = process.env.PORT || 3001;
const wsPort = process.env.WS_PORT || 8080;

// Create HTTP server for Express
const server = http.createServer(app);

// Initialize database client
const dbClient = new DatabaseClient();

// Global variables to track event listener status
let eventListener = null;
let eventListenerStartTime = null;

// WebSocket server setup
const wss = new WebSocket.Server({ port: wsPort });
const clients = new Map(); // Track clients and their subscriptions

// WebSocket connection handler
wss.on('connection', (ws) => {
  logger.info('New WebSocket client connected');
  
  // Initialize client data
  const clientId = Date.now().toString();
  clients.set(clientId, {
    ws: ws,
    subscriptions: new Set(),
    connected: Date.now(),
    lastPing: Date.now()
  });

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.action === 'subscribe' && data.gameId) {
        const gameId = parseInt(data.gameId);
        clients.get(clientId).subscriptions.add(`game-${gameId}`);
        
        logger.info(`Client ${clientId} subscribed to game ${gameId}`);
        
        // Send confirmation
        ws.send(JSON.stringify({
          type: 'subscription-confirmed',
          gameId: gameId,
          timestamp: new Date().toISOString()
        }));
      }
      
      if (data.action === 'unsubscribe' && data.gameId) {
        const gameId = parseInt(data.gameId);
        clients.get(clientId).subscriptions.delete(`game-${gameId}`);
        
        logger.info(`Client ${clientId} unsubscribed from game ${gameId}`);
      }
      
      if (data.action === 'ping') {
        clients.get(clientId).lastPing = Date.now();
        // Send pong response
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
      
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    logger.info(`WebSocket client ${clientId} disconnected`);
    clients.delete(clientId);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    timestamp: new Date().toISOString(),
    message: 'Connected to Minority Rule indexer WebSocket'
  }));
});

// Function to broadcast messages to subscribed clients
function broadcastToGame(gameId, message) {
  const gameChannel = `game-${gameId}`;
  let sentCount = 0;
  
  clients.forEach((client, clientId) => {
    if (client.subscriptions.has(gameChannel) && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({
          ...message,
          gameId: gameId,
          timestamp: new Date().toISOString()
        }));
        sentCount++;
      } catch (error) {
        logger.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  });
  
  if (sentCount > 0) {
    logger.info(`Broadcasted message to ${sentCount} clients for game ${gameId}`);
  }
}

// Function to broadcast to all clients
function broadcastToAll(message) {
  let sentCount = 0;
  
  clients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }));
        sentCount++;
      } catch (error) {
        logger.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  });
  
  logger.info(`Broadcasted message to ${sentCount} clients`);
}

// Connection cleanup - remove inactive clients
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  clients.forEach((client, clientId) => {
    if (now - client.lastPing > timeout || client.ws.readyState !== WebSocket.OPEN) {
      logger.info(`Cleaning up inactive client ${clientId}`);
      clients.delete(clientId);
      
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    }
  });
}, 60000); // Check every minute

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Enhanced health check endpoints
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await dbClient.healthCheck();
    const flowHealthy = await checkFlowNodeHealth();
    
    const now = Date.now();
    const listenerHealth = getEventListenerHealth();
    
    // Determine overall status
    const isHealthy = dbHealthy && flowHealthy && listenerHealth.status === 'healthy';
    
    const health = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      flow_node: flowHealthy ? 'connected' : 'disconnected',
      event_listener: listenerHealth,
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      system_metrics: systemMonitor.getSystemMetrics()
    };

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/health/database', async (req, res) => {
  try {
    const isHealthy = await dbClient.healthCheck();
    
    if (isHealthy) {
      res.json({ status: 'healthy', database: 'connected' });
    } else {
      res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.get('/health/flow', async (req, res) => {
  try {
    const isHealthy = await checkFlowNodeHealth();
    
    if (isHealthy) {
      res.json({ status: 'healthy', flow_node: 'connected' });
    } else {
      res.status(503).json({ status: 'unhealthy', flow_node: 'disconnected' });
    }
  } catch (error) {
    logger.error('Flow node health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.get('/health/listener', (req, res) => {
  try {
    const listenerHealth = getEventListenerHealth();
    
    if (listenerHealth.status === 'healthy') {
      res.json(listenerHealth);
    } else {
      res.status(503).json(listenerHealth);
    }
  } catch (error) {
    logger.error('Event listener health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Helper functions for health checks
async function checkFlowNodeHealth() {
  try {
    const fcl = require('@onflow/fcl');
    const latestBlock = await fcl.send([fcl.getLatestBlock()]);
    const block = await fcl.decode(latestBlock);
    return !!(block && block.id);
  } catch (error) {
    logger.error('Flow node health check failed:', error);
    return false;
  }
}

function getEventListenerHealth() {
  const now = Date.now();
  
  if (!eventListener || !eventListener.isListening) {
    return {
      status: 'unhealthy',
      reason: 'Event listener not running',
      is_listening: false,
      uptime: 0
    };
  }
  
  const uptimeMs = eventListenerStartTime ? now - eventListenerStartTime : 0;
  const timeSinceLastEvent = now - eventListener.lastEventReceived;
  const connectionRetries = eventListener.connectionRetries || 0;
  
  // Consider unhealthy if no events for more than 10 minutes
  const maxIdleTime = 10 * 60 * 1000; // 10 minutes
  const isStale = timeSinceLastEvent > maxIdleTime;
  
  return {
    status: isStale ? 'unhealthy' : 'healthy',
    is_listening: eventListener.isListening,
    uptime_ms: uptimeMs,
    uptime_human: formatUptime(uptimeMs),
    last_event_received_ms_ago: timeSinceLastEvent,
    last_event_received_human: formatUptime(timeSinceLastEvent),
    connection_retries: connectionRetries,
    reason: isStale ? `No events received for ${Math.round(timeSinceLastEvent / 60000)} minutes` : null
  };
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Detailed metrics endpoint
app.get('/metrics', (req, res) => {
  try {
    const report = systemMonitor.generateReport();
    res.json(report);
  } catch (error) {
    logger.error('Metrics endpoint failed:', error);
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error.message
    });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'minority-rule-indexer',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    flow_network: process.env.FLOW_NETWORK,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Express error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Add WebSocket status to health check
app.get('/health/websocket', (req, res) => {
  try {
    const connectedClients = clients.size;
    const totalSubscriptions = Array.from(clients.values())
      .reduce((total, client) => total + client.subscriptions.size, 0);
    
    res.json({
      status: 'healthy',
      websocket_port: wsPort,
      connected_clients: connectedClients,
      total_subscriptions: totalSubscriptions,
      clients: Array.from(clients.entries()).map(([id, client]) => ({
        id,
        connected_at: new Date(client.connected).toISOString(),
        subscriptions: Array.from(client.subscriptions)
      }))
    });
  } catch (error) {
    logger.error('WebSocket health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Export broadcast functions for use by event processor
module.exports.broadcastToGame = broadcastToGame;
module.exports.broadcastToAll = broadcastToAll;

// Start HTTP server
server.listen(port, async () => {
  logger.info(`Minority Rule Indexer started on port ${port}`);
  logger.info(`WebSocket server started on port ${wsPort}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Flow Network: ${process.env.FLOW_NETWORK}`);
  
  // Test database connection
  try {
    const dbHealthy = await dbClient.healthCheck();
    if (dbHealthy) {
      logger.info('Database connection successful');
    } else {
      logger.error('Database connection failed');
    }
  } catch (error) {
    logger.error('Database connection error:', error);
  }

  // Start Flow event listener with WebSocket broadcast functions
  try {
    eventListener = await startFlowEventListener(dbClient, { broadcastToGame, broadcastToAll });
    eventListenerStartTime = Date.now();
    logger.info('Flow event listener started');
  } catch (error) {
    logger.error('Failed to start Flow event listener:', error);
  }

  // Start system monitoring
  systemMonitor.startMonitoring(5); // Report every 5 minutes
});

module.exports = { app, server, broadcastToGame, broadcastToAll };