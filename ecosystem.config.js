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
      PORT: 3000,
      // Application Gateway 優化環境變數
      TRUST_PROXY: true,
      NGINX_REVERSE_PROXY: true,
      CLUSTER_MODE: true
    },
    error_file: '/var/log/pm2/qef-chatbot-error.log',
    out_file: '/var/log/pm2/qef-chatbot-out.log',
    log_file: '/var/log/pm2/qef-chatbot.log',
    time: true,
    max_memory_restart: '2G', // 增加到 2GB
    watch: false,
    ignore_watch: ['node_modules', '.next', 'logs', 'uploads'],
    restart_delay: 4000,
    
    // Health check - 優化為與 Application Gateway 配合
    health_check_grace_period: 15000, // 增加健康檢查時間
    health_check_interval: 30000,
    
    // Auto restart configuration
    max_restarts: 10,
    min_uptime: '60s', // 增加最小運行時間，確保穩定性
    
    // Node.js 優化設置
    node_args: [
      '--max-old-space-size=2048', // 增加 Node.js 內存限制
      '--optimize-for-size', // 優化內存使用
      '--gc-interval=100' // 垃圾回收間隔
    ],
    
    // 進程管理
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // 日誌輪轉
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 錯誤處理
    autorestart: true,
    max_restarts: 10,
    restart_delay: 4000,
    
    // 環境特定配置
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      TRUST_PROXY: true,
      NGINX_REVERSE_PROXY: true,
      CLUSTER_MODE: true,
      // 日誌級別
      LOG_LEVEL: 'info',
      // 性能監控
      ENABLE_METRICS: true
    },
    
    // 開發環境配置
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      TRUST_PROXY: false,
      LOG_LEVEL: 'debug'
    }
  }]
};