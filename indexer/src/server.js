const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const { DatabaseClient } = require('./database/client');
const { startFlowEventListener } = require('./flow/eventListener');
const { logger } = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3001;

// Initialize database client
const dbClient = new DatabaseClient();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await dbClient.healthCheck();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    };

    res.json(health);
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
    await startFlowEventListener(dbClient);
    logger.info('Flow event listener started');
  } catch (error) {
    logger.error('Failed to start Flow event listener:', error);
  }
});

module.exports = { app, server };