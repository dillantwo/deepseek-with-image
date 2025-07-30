#!/bin/bash

# QEF ChatBot Ubuntu 24.04 部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🚀 开始部署 QEF ChatBot 到 Ubuntu 24.04..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="qef-chatbot"
PROJECT_DIR="/var/www/$PROJECT_NAME"
DOMAIN="your-domain.com"  # 请替换为您的域名
PORT=3000

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "请不要使用 root 用户运行此脚本"
        exit 1
    fi
}

# 更新系统
update_system() {
    print_step "更新系统包..."
    sudo apt update
    sudo apt upgrade -y
    print_success "系统更新完成"
}

# 安装必要的系统依赖
install_dependencies() {
    print_step "安装系统依赖..."
    sudo apt install -y curl wget git build-essential software-properties-common
    print_success "系统依赖安装完成"
}

# 安装 Node.js (使用 NodeSource repository)
install_nodejs() {
    print_step "安装 Node.js..."
    
    # 检查 Node.js 是否已安装
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_warning "Node.js 已安装: $NODE_VERSION"
        return
    fi
    
    # 安装 Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # 验证安装
    node_version=$(node -v)
    npm_version=$(npm -v)
    print_success "Node.js 安装完成: $node_version, npm: $npm_version"
}

# 安装 PM2
install_pm2() {
    print_step "安装 PM2..."
    
    if command -v pm2 &> /dev/null; then
        print_warning "PM2 已安装"
        return
    fi
    
    sudo npm install -g pm2
    
    # 配置 PM2 开机自启
    sudo pm2 startup
    print_success "PM2 安装完成"
}

# 安装 Nginx
install_nginx() {
    print_step "安装 Nginx..."
    
    if command -v nginx &> /dev/null; then
        print_warning "Nginx 已安装"
        return
    fi
    
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    print_success "Nginx 安装完成"
}

# 创建项目目录
setup_project_directory() {
    print_step "设置项目目录..."
    
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
    print_success "项目目录创建完成: $PROJECT_DIR"
}

# 克隆或复制项目代码
deploy_code() {
    print_step "部署代码..."
    
    if [ -d "$PROJECT_DIR/.git" ]; then
        print_warning "检测到 Git 仓库，拉取最新代码..."
        cd $PROJECT_DIR
        git pull
    else
        print_warning "请手动将代码复制到 $PROJECT_DIR"
        print_warning "或者设置 Git 仓库地址进行克隆"
        echo "例如: git clone https://github.com/your-username/your-repo.git $PROJECT_DIR"
    fi
}

# 安装项目依赖
install_project_dependencies() {
    print_step "安装项目依赖..."
    
    cd $PROJECT_DIR
    npm ci --production
    print_success "项目依赖安装完成"
}

# 构建项目
build_project() {
    print_step "构建项目..."
    
    cd $PROJECT_DIR
    npm run build
    print_success "项目构建完成"
}

# 配置环境变量
setup_env() {
    print_step "配置环境变量..."
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        print_warning "未找到 .env 文件，请手动创建"
        cat << EOF > $PROJECT_DIR/.env.example
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
MONGODB_URI=your_mongodb_uri
SIGNING_SECRET=your_signing_secret
DEEPSEEK_API_KEY=your_deepseek_api_key
FLOWISE_BASE_URL=https://aai03.eduhk.hk
FLOWISE_API_KEY=your_flowise_api_key
EOF
        print_warning "请编辑 $PROJECT_DIR/.env.example 并重命名为 .env"
    else
        print_success "环境变量文件已存在"
    fi
}

# 配置 PM2
configure_pm2() {
    print_step "配置 PM2..."
    
    cat << EOF > $PROJECT_DIR/ecosystem.config.js
module.exports = {
  apps: [{
    name: '$PROJECT_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$PROJECT_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '/var/log/pm2/$PROJECT_NAME-error.log',
    out_file: '/var/log/pm2/$PROJECT_NAME-out.log',
    log_file: '/var/log/pm2/$PROJECT_NAME.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', '.next', 'logs'],
    restart_delay: 4000
  }]
};
EOF

    # 创建日志目录
    sudo mkdir -p /var/log/pm2
    sudo chown $USER:$USER /var/log/pm2
    
    print_success "PM2 配置完成"
}

# 配置 Nginx
configure_nginx() {
    print_step "配置 Nginx..."
    
    # 备份默认配置
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup 2>/dev/null || true
    
    # 创建项目配置
    sudo tee /etc/nginx/sites-available/$PROJECT_NAME > /dev/null << EOF
# QEF ChatBot Nginx 反向代理配置
upstream qef_backend {
    server 127.0.0.1:$PORT;
    keepalive 32;
}

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 日志配置
    access_log /var/log/nginx/qef-chatbot-access.log;
    error_log /var/log/nginx/qef-chatbot-error.log;
    
    # 文件上传大小限制
    client_max_body_size 10M;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Next.js 静态文件缓存优化
    location /_next/static/ {
        alias $PROJECT_DIR/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        
        # 预压缩文件支持
        location ~* \.(js|css)$ {
            gzip_static on;
        }
    }
    
    # 公共静态文件
    location /assets/ {
        alias $PROJECT_DIR/assets/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # Favicon 和其他静态文件
    location ~* \.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        root $PROJECT_DIR/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 路由 - 不缓存，特殊处理
    location /api/ {
        proxy_pass http://qef_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # API 专用超时设置（长一些，因为 AI 响应可能较慢）
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # 不缓存 API 响应
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        
        # API 专用缓冲设置
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # 主应用反向代理
    location / {
        proxy_pass http://qef_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 标准超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # 连接复用
        proxy_set_header Connection "";
    }
    
    # 健康检查端点
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # 安全头配置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://aai03.eduhk.hk https://*.clerk.dev https://*.clerk.com wss://*.clerk.dev wss://*.clerk.com;" always;
    
    # 错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /var/www/html;
    }
}

# 如果您想要重定向 www 到非 www（可选）
server {
    listen 80;
    server_name www.$DOMAIN;
    return 301 http://$DOMAIN\$request_uri;
}
EOF

    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
    
    # 删除默认站点（可选）
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试 Nginx 配置
    sudo nginx -t
    
    # 重启 Nginx
    sudo systemctl reload nginx
    
    print_success "Nginx 配置完成"
}

# 配置防火墙
configure_firewall() {
    print_step "配置防火墙..."
    
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    print_success "防火墙配置完成"
}

# 启动应用
start_application() {
    print_step "启动应用..."
    
    cd $PROJECT_DIR
    pm2 start ecosystem.config.js
    pm2 save
    
    print_success "应用启动完成"
}

# SSL 证书配置提示
ssl_instructions() {
    print_step "SSL 证书配置提示"
    echo -e "${YELLOW}为了安全，建议配置 SSL 证书。可以使用以下命令安装 Let's Encrypt:${NC}"
    echo "sudo apt install certbot python3-certbot-nginx"
    echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
}

# 部署状态检查
check_deployment() {
    print_step "检查部署状态..."
    
    # 检查 PM2 状态
    echo "PM2 状态:"
    pm2 status
    
    # 检查 Nginx 状态
    echo "Nginx 状态:"
    sudo systemctl status nginx --no-pager
    
    # 检查端口
    echo "端口监听状态:"
    sudo netstat -tlnp | grep :$PORT || echo "端口 $PORT 未监听"
    sudo netstat -tlnp | grep :80 || echo "端口 80 未监听"
    
    print_success "部署状态检查完成"
}

# 主函数
main() {
    print_step "开始部署流程..."
    
    check_root
    update_system
    install_dependencies
    install_nodejs
    install_pm2
    install_nginx
    setup_project_directory
    deploy_code
    
    print_warning "请确保您已将代码复制到 $PROJECT_DIR"
    read -p "代码已就绪？继续部署请按 Enter..."
    
    install_project_dependencies
    setup_env
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        print_error "请先配置 .env 文件后再继续"
        exit 1
    fi
    
    build_project
    configure_pm2
    configure_nginx
    configure_firewall
    start_application
    check_deployment
    ssl_instructions
    
    print_success "🎉 部署完成！"
    echo -e "${GREEN}您的应用现在应该可以通过以下地址访问:${NC}"
    echo -e "${GREEN}HTTP: http://$DOMAIN${NC}"
    echo -e "${GREEN}或者直接 IP: http://$(curl -s ifconfig.me)${NC}"
    echo ""
    echo -e "${YELLOW}常用管理命令:${NC}"
    echo "pm2 status              # 查看应用状态"
    echo "pm2 logs $PROJECT_NAME  # 查看应用日志"
    echo "pm2 restart $PROJECT_NAME # 重启应用"
    echo "pm2 stop $PROJECT_NAME     # 停止应用"
    echo "sudo systemctl status nginx # 查看 Nginx 状态"
}

# 运行主函数
main "$@"