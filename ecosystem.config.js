module.exports = {
  apps: [{
    name: 'qef-chatbot',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/qef-chatbot',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/qef-chatbot-error.log',
    out_file: '/var/log/pm2/qef-chatbot-out.log',
    log_file: '/var/log/pm2/qef-chatbot.log',
    time: true,
    max_memory_restart: '2G', // 增加到 2GB
    watch: false,
    ignore_watch: ['node_modules', '.next', 'logs'],
    restart_delay: 4000,
    // Health check
    health_check_grace_period: 10000, // 增加健康檢查時間
    health_check_interval: 30000,
    // Auto restart configuration
    max_restarts: 10,
    min_uptime: '30s', // 增加最小運行時間
    // Node.js 優化設置
    node_args: ['--max-old-space-size=2048'] // 增加 Node.js 內存限制
  }]
};