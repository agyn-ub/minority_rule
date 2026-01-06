module.exports = {
  apps: [
    {
      name: 'minority-rule-indexer',
      script: './src/server.js',
      instances: 1, // Single instance for indexer to avoid duplicate processing
      exec_mode: 'fork',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Don't watch files in production
      max_memory_restart: '500MB',
      restart_delay: 5000, // Wait 5 seconds before restart
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOG_LEVEL: 'debug'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info'
      },
      
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      min_uptime: '10s', // Minimum uptime before considering stable
      max_restarts: 10, // Max restarts within unstable_restarts timeframe
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Advanced options
      merge_logs: true,
      combine_logs: true,
      
      // Health check endpoint for monitoring
      health_check_url: 'http://localhost:3001/health',
      health_check_grace_period: 30000, // 30 seconds grace period
      
      // Process monitoring
      monitoring: false, // Set to true if you have PM2 Plus monitoring
      
      // Memory and CPU limits
      node_args: '--max-old-space-size=512', // Limit Node.js memory to 512MB
      
      // Error handling
      ignore_watch: [
        'node_modules',
        'logs'
      ],
      
      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100,
      
      // Custom error handling
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log'
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'your-git-repo',
      path: '/var/www/minority-rule-indexer',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};