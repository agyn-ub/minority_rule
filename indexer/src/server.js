const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const { DatabaseClient } = require('./database/client');
const { startFlowEventListener } = require('./flow/eventListener');
const { logger } = require('./utils/logger');
const { systemMonitor } = require('./utils/monitoring');

const app = express();
const port = process.env.PORT || 3001;

// Initialize database client
const dbClient = new DatabaseClient();

// Global variables to track event listener status
let eventListener = null;
let eventListenerStartTime = null;

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

// Start server
const server = app.listen(port, async () => {
  logger.info(`Minority Rule Indexer started on port ${port}`);
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

  // Start Flow event listener
  try {
    eventListener = await startFlowEventListener(dbClient);
    eventListenerStartTime = Date.now();
    logger.info('Flow event listener started');
  } catch (error) {
    logger.error('Failed to start Flow event listener:', error);
  }

  // Start system monitoring
  systemMonitor.startMonitoring(5); // Report every 5 minutes
});

module.exports = { app, server };