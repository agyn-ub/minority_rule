# Production Deployment Guide

This guide covers production deployment and monitoring of the Minority Rule Indexer.

## Production Features Implemented

### 1. Connection Reliability
- **Exponential backoff retry logic** - Automatic reconnection with increasing delays
- **Health check monitoring** - Periodic Flow node connectivity checks every 60 seconds
- **Connection keepalive** - Heartbeat pings every 30 seconds to prevent idle timeouts
- **Automatic failover** - Seamless reconnection on connection drops

### 2. Process Management
- **PM2 configuration** - Production-grade process management
- **Memory limits** - Automatic restart at 500MB memory usage
- **Graceful shutdown** - Proper cleanup of connections and intervals
- **Auto-restart** - Automatic restart on crashes with exponential backoff

### 3. Monitoring & Health Checks
- **Comprehensive health endpoints**:
  - `/health` - Overall system health
  - `/health/database` - Database connectivity
  - `/health/flow` - Flow node connectivity  
  - `/health/listener` - Event listener status
  - `/metrics` - Detailed system metrics

- **System monitoring**:
  - Memory usage tracking
  - CPU usage monitoring
  - Event processing statistics
  - Success/failure rates
  - Uptime tracking

## Quick Start

### Install PM2 (if not already installed)
```bash
npm install -g pm2
```

### Start in Production Mode
```bash
# Start the indexer
pm2 start ecosystem.config.js --env production

# Monitor the process
pm2 logs minority-rule-indexer
pm2 monit

# Check status
pm2 status
```

### Health Monitoring
```bash
# Check overall health
curl http://localhost:3001/health

# Get detailed metrics
curl http://localhost:3001/metrics

# Check specific components
curl http://localhost:3001/health/database
curl http://localhost:3001/health/flow
curl http://localhost:3001/health/listener
```

## Environment Variables

Create a `.env` file with the following required variables:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/minority_rule
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Flow Configuration
FLOW_ACCESS_NODE=https://rest-mainnet.onflow.org
FLOW_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
FLOW_NETWORK=mainnet

# Server Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

## PM2 Configuration

The `ecosystem.config.js` file includes:

- **Single instance** - Prevents duplicate event processing
- **Memory limit** - 500MB restart threshold
- **Auto-restart** - Enabled with exponential backoff
- **Logging** - Structured logs in `./logs/` directory
- **Health checks** - Built-in endpoint monitoring
- **Graceful shutdown** - 5-second timeout for cleanup

## Monitoring Setup

### 1. Health Check Endpoints

| Endpoint | Description | Returns |
|----------|-------------|---------|
| `/health` | Overall system status | 200 (healthy) / 503 (unhealthy) |
| `/health/database` | Database connectivity | Connection status |
| `/health/flow` | Flow node connectivity | Node status |
| `/health/listener` | Event listener status | Listener health + metrics |
| `/metrics` | Detailed system metrics | Full system report |

### 2. Key Metrics Monitored

- **Memory Usage**: Heap usage, RSS, system memory
- **CPU Usage**: Process CPU percentage, load average
- **Event Processing**: Success rate, events/minute, failures
- **Connectivity**: Database status, Flow node status, listener uptime
- **System Health**: Process uptime, connection retries

### 3. Alerting Thresholds

The system reports issues when:
- Heap memory usage > 80%
- System memory usage > 90%
- CPU usage > 80%
- Event success rate < 95% (with >10 events)
- No events received for >10 minutes

## Log Management

### Log Files
- `./logs/combined.log` - All logs combined
- `./logs/out.log` - Standard output
- `./logs/error.log` - Error logs only

### Log Rotation (Recommended)
```bash
# Install logrotate (Ubuntu/Debian)
sudo apt-get install logrotate

# Create logrotate config
sudo tee /etc/logrotate.d/minority-rule-indexer << 'EOF'
/path/to/indexer/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reload minority-rule-indexer
    endscript
}
EOF
```

## Performance Tuning

### Node.js Memory Optimization
```bash
# The PM2 config includes optimized Node.js flags
node_args: '--max-old-space-size=512'
```

### Database Connection Pooling
Ensure your database client uses connection pooling:
- Max connections: 10-20
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

### Flow Node Selection
For production, use:
- **Mainnet**: `https://rest-mainnet.onflow.org`
- **Testnet**: `https://rest-testnet.onflow.org`

Consider using multiple nodes for redundancy.

## Troubleshooting

### Common Issues

1. **"Indexer sleeping" / No events**
   - Check `/health/listener` endpoint
   - Verify Flow node connectivity
   - Check heartbeat logs for connection issues

2. **High memory usage**
   - Monitor `/metrics` endpoint
   - Check for memory leaks in logs
   - PM2 will auto-restart at 500MB

3. **Database connection issues**
   - Check `/health/database` endpoint
   - Verify database credentials
   - Check network connectivity

4. **Flow node connectivity**
   - Check `/health/flow` endpoint
   - Try different Flow access nodes
   - Verify network/firewall settings

### Debug Mode
```bash
# Start with debug logging
NODE_ENV=development LOG_LEVEL=debug pm2 start ecosystem.config.js
```

### Manual Restart
```bash
# Restart the process
pm2 restart minority-rule-indexer

# Reload with zero downtime
pm2 reload minority-rule-indexer

# Stop and start
pm2 stop minority-rule-indexer
pm2 start minority-rule-indexer
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Database Access**: Use restricted database users
3. **Network**: Consider firewall rules for database access
4. **Monitoring**: Secure health endpoints if externally accessible
5. **Logs**: Ensure logs don't contain sensitive information

## Monitoring Integration

### External Monitoring Tools

The health endpoints can be integrated with:
- **Uptime monitoring**: Ping `/health` endpoint
- **APM tools**: New Relic, DataDog (via `/metrics`)
- **Log aggregation**: ELK stack, Splunk
- **Alerting**: PagerDuty, Slack webhooks

### Sample Uptime Monitor
```bash
# Simple script for external monitoring
#!/bin/bash
HEALTH_URL="http://localhost:3001/health"
if ! curl -f -s $HEALTH_URL > /dev/null; then
    echo "Indexer health check failed" | mail -s "Alert: Indexer Down" admin@example.com
fi
```

## Scaling Considerations

- **Single Instance Only**: The indexer must run as a single instance to prevent duplicate processing
- **Database Scaling**: Scale the database separately if needed
- **Load Balancing**: Not applicable for the indexer (single instance)
- **Resource Allocation**: Monitor `/metrics` to determine appropriate server sizing

## Backup and Recovery

1. **Database Backups**: Ensure regular Supabase/PostgreSQL backups
2. **Configuration**: Version control `ecosystem.config.js` and environment configs
3. **Logs**: Consider long-term log storage for debugging
4. **State Recovery**: The indexer is stateless and will resume from where it left off