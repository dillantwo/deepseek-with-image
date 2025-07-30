#!/bin/bash

# QEF ChatBot 快速部署脚本
# 适用于测试环境快速部署

set -e

echo "🚀 QEF ChatBot 快速部署开始..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/var/www/qef-chatbot"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}安装 Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}安装 PM2...${NC}"
    sudo npm install -g pm2
fi

# 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}安装 Nginx...${NC}"
    sudo apt update
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi

# 创建项目目录
echo -e "${YELLOW}设置项目目录...${NC}"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# 提示用户复制代码
echo -e "${YELLOW}请将您的项目代码复制到: $PROJECT_DIR${NC}"
echo "您可以使用以下方法之一："
echo "1. 使用 scp: scp -r /path/to/your/project/* user@server:$PROJECT_DIR"
echo "2. 使用 git clone: git clone https://github.com/your-repo.git $PROJECT_DIR"
echo "3. 手动上传文件"

read -p "代码已复制完成？按 Enter 继续..."

# 检查代码是否存在
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}错误: 未找到 package.json 文件在 $PROJECT_DIR${NC}"
    exit 1
fi

# 安装依赖
echo -e "${YELLOW}安装项目依赖...${NC}"
cd $PROJECT_DIR
npm install

# 检查 .env 文件
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${YELLOW}创建 .env 文件模板...${NC}"
    cat << 'EOF' > $PROJECT_DIR/.env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
SIGNING_SECRET=your_signing_secret_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
FLOWISE_BASE_URL=https://aai03.eduhk.hk
FLOWISE_API_KEY=your_flowise_api_key_here
EOF
    echo -e "${RED}请编辑 $PROJECT_DIR/.env 文件，填入正确的配置信息${NC}"
    read -p "配置完成后按 Enter 继续..."
fi

# 构建项目
echo -e "${YELLOW}构建项目...${NC}"
npm run build

# 配置 PM2
echo -e "${YELLOW}配置 PM2...${NC}"
pm2 stop qef-chatbot 2>/dev/null || true
pm2 delete qef-chatbot 2>/dev/null || true
pm2 start npm --name "qef-chatbot" -- start
pm2 save

# 配置 Nginx
echo -e "${YELLOW}配置 Nginx...${NC}"
sudo tee /etc/nginx/sites-available/qef-chatbot > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/qef-chatbot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试并重启 Nginx
sudo nginx -t
sudo systemctl reload nginx

# 配置防火墙
echo -e "${YELLOW}配置防火墙...${NC}"
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}您的应用现在可以通过以下地址访问:${NC}"
echo -e "${GREEN}http://$(curl -s ifconfig.me)${NC}"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "pm2 status          # 查看应用状态"
echo "pm2 logs qef-chatbot # 查看日志"
echo "pm2 restart qef-chatbot # 重启应用"
