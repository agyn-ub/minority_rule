const os = require('os');
const { logger } = require('./logger');

class SystemMonitor {
  constructor() {
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
    this.eventCounts = {
      total: 0,
      successful: 0,
      failed: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();
    
    // Calculate CPU percentage (approximation)
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000 / 1000 * 100;
    
    return {
      // Process metrics
      uptime: {
        process: process.uptime(),
        system: os.uptime(),
        human: this.formatUptime(process.uptime())
      },
      
      // Memory metrics
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        heapUsedPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        systemTotal: os.totalmem(),
        systemFree: os.freemem(),
        systemUsedPercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      
      // CPU metrics
      cpu: {
        usage: cpuUsage,
        percent: cpuPercent,
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      
      // Event processing metrics
      events: {
        ...this.eventCounts,
        successRate: this.eventCounts.total > 0 ? 
          (this.eventCounts.successful / this.eventCounts.total) * 100 : 100,
        eventsPerMinute: this.calculateEventsPerMinute()
      },
      
      // Network and system info
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.version
      }
    };
  }

  /**
   * Record event processing
   */
  recordEvent(success = true) {
    this.eventCounts.total++;
    if (success) {
      this.eventCounts.successful++;
    } else {
      this.eventCounts.failed++;
    }
  }

  /**
   * Reset event counters
   */
  resetEventCounters() {
    this.eventCounts = {
      total: 0,
      successful: 0,
      failed: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Calculate events per minute
   */
  calculateEventsPerMinute() {
    const minutesSinceReset = (Date.now() - this.eventCounts.lastReset) / 60000;
    return minutesSinceReset > 0 ? this.eventCounts.total / minutesSinceReset : 0;
  }

  /**
   * Check if system metrics are within healthy thresholds
   */
  checkHealth() {
    const metrics = this.getSystemMetrics();
    const issues = [];
    
    // Memory health checks
    if (metrics.memory.heapUsedPercent > 80) {
      issues.push(`High heap usage: ${metrics.memory.heapUsedPercent.toFixed(1)}%`);
    }
    
    if (metrics.memory.systemUsedPercent > 90) {
      issues.push(`High system memory usage: ${metrics.memory.systemUsedPercent.toFixed(1)}%`);
    }
    
    // CPU health checks
    if (metrics.cpu.percent > 80) {
      issues.push(`High CPU usage: ${metrics.cpu.percent.toFixed(1)}%`);
    }
    
    // Event processing health checks
    if (metrics.events.successRate < 95 && metrics.events.total > 10) {
      issues.push(`Low event success rate: ${metrics.events.successRate.toFixed(1)}%`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics
    };
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring(intervalMinutes = 5) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(() => {
      const health = this.checkHealth();
      
      if (health.healthy) {
        logger.info('System health check: OK', {
          uptime: health.metrics.uptime.human,
          heapUsed: `${(health.metrics.memory.heapUsed / 1024 / 1024).toFixed(1)}MB`,
          eventsProcessed: health.metrics.events.total,
          successRate: `${health.metrics.events.successRate.toFixed(1)}%`
        });
      } else {
        logger.warn('System health check: Issues detected', {
          issues: health.issues,
          metrics: {
            uptime: health.metrics.uptime.human,
            memory: `${health.metrics.memory.heapUsedPercent.toFixed(1)}%`,
            cpu: `${health.metrics.cpu.percent.toFixed(1)}%`,
            events: health.metrics.events
          }
        });
      }
    }, intervalMs);
    
    logger.info(`System monitoring started - reporting every ${intervalMinutes} minutes`);
  }

  /**
   * Format uptime in human readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    const metrics = this.getSystemMetrics();
    const health = this.checkHealth();
    
    return {
      timestamp: new Date().toISOString(),
      status: health.healthy ? 'healthy' : 'unhealthy',
      issues: health.issues,
      detailed_metrics: {
        process: {
          pid: process.pid,
          uptime: metrics.uptime.human,
          version: metrics.system.nodeVersion
        },
        memory: {
          heap_used_mb: (metrics.memory.heapUsed / 1024 / 1024).toFixed(1),
          heap_total_mb: (metrics.memory.heapTotal / 1024 / 1024).toFixed(1),
          heap_used_percent: metrics.memory.heapUsedPercent.toFixed(1),
          rss_mb: (metrics.memory.rss / 1024 / 1024).toFixed(1)
        },
        cpu: {
          load_average: metrics.cpu.loadAverage,
          cores: metrics.cpu.cores,
          usage_percent: metrics.cpu.percent.toFixed(1)
        },
        events: {
          total_processed: metrics.events.total,
          success_rate: `${metrics.events.successRate.toFixed(1)}%`,
          events_per_minute: metrics.events.eventsPerMinute.toFixed(2),
          failed_count: metrics.events.failed
        }
      }
    };
  }
}

// Singleton instance
const systemMonitor = new SystemMonitor();

module.exports = {
  SystemMonitor,
  systemMonitor
};