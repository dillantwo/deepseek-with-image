# QEF ChatBot Ubuntu 24.04 部署指南

## 部署前准备

### 1. 服务器要求
- **操作系统**: Ubuntu 24.04 LTS
- **内存**: 至少 2GB RAM（推荐 4GB+）
- **存储**: 至少 20GB 可用空间
- **网络**: 稳定的互联网连接

### 2. 域名配置（可选）
如果您有域名，请将 A 记录指向您的服务器 IP 地址。

## 快速部署（推荐新手）

### 步骤 1: 连接服务器
```bash
ssh your-username@your-server-ip
```

### 步骤 2: 下载项目到服务器
方法1 - 使用 SCP 从本地上传：
```bash
# 在本地执行
scp -r /path/to/qef_chatbot your-username@your-server-ip:/tmp/
```

方法2 - 使用 Git 克隆：
```bash
# 在服务器执行
git clone https://github.com/your-username/your-repo.git /tmp/qef_chatbot
```

### 步骤 3: 运行快速部署脚本
```bash
cd /tmp/qef_chatbot
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### 步骤 4: 配置环境变量
编辑 `/var/www/qef-chatbot/.env` 文件：
```bash
sudo nano /var/www/qef-chatbot/.env
```

填入您的实际配置：
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_你的clerk公钥
CLERK_SECRET_KEY=sk_test_你的clerk私钥
MONGODB_URI=mongodb+srv://用户名:密码@集群地址/数据库名
SIGNING_SECRET=随机生成的签名密钥
DEEPSEEK_API_KEY=你的deepseek_api_key
FLOWISE_BASE_URL=https://aai03.eduhk.hk
FLOWISE_API_KEY=你的flowise_api_key
```

### 步骤 5: 重启应用
```bash
pm2 restart qef-chatbot
```

## 完整部署（高级用户）

如果您需要更多控制和自定义配置：

```bash
chmod +x deploy.sh
./deploy.sh
```

## 部署后验证

### 1. 检查应用状态
```bash
# 检查 PM2 状态
pm2 status

# 检查 PM2 日志
pm2 logs qef-chatbot

# 检查 Nginx 状态
sudo systemctl status nginx
```

### 2. 测试访问
- 通过浏览器访问: `http://your-server-ip`
- 或通过域名访问: `http://your-domain.com`

### 3. 健康检查
```bash
# 检查端口监听
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80

# 检查应用响应
curl http://localhost:3000
```

## SSL 证书配置（HTTPS）

### 使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书（替换为您的域名）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 常用管理命令

### PM2 应用管理
```bash
pm2 status                    # 查看所有应用状态
pm2 logs qef-chatbot         # 查看应用日志
pm2 restart qef-chatbot      # 重启应用
pm2 stop qef-chatbot         # 停止应用
pm2 start qef-chatbot        # 启动应用
pm2 delete qef-chatbot       # 删除应用
pm2 monit                    # 实时监控
```

### Nginx 管理
```bash
sudo systemctl status nginx   # 查看 Nginx 状态
sudo systemctl reload nginx   # 重载配置
sudo systemctl restart nginx  # 重启 Nginx
sudo nginx -t                # 测试配置文件
```

### 查看日志
```bash
# PM2 日志
pm2 logs qef-chatbot

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx -f
```

## 常见问题解决

### 1. 应用无法启动
```bash
# 检查环境变量配置
cat /var/www/qef-chatbot/.env

# 检查 Node.js 版本
node -v

# 检查依赖安装
cd /var/www/qef-chatbot && npm list
```

### 2. 502 Bad Gateway 错误
```bash
# 检查应用是否运行
pm2 status

# 检查端口监听
sudo netstat -tlnp | grep :3000

# 重启应用
pm2 restart qef-chatbot
```

### 3. 连接数据库失败
- 检查 MongoDB URI 是否正确
- 确认网络可以访问 MongoDB 服务器
- 验证用户名密码是否正确

### 4. Clerk 认证问题
- 检查 Clerk 公钥和私钥是否正确
- 确认域名配置是否匹配

## 性能优化建议

### 1. 服务器优化
```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. PM2 配置优化
根据服务器配置调整 `ecosystem.config.js` 中的 `instances` 参数：
- 1-2GB RAM: instances: 1
- 4GB RAM: instances: 2
- 8GB+ RAM: instances: 'max'

### 3. Nginx 缓存
启用 Nginx 缓存可以提高静态资源加载速度，详细配置见 `nginx.conf` 文件。

## 监控和维护

### 1. 设置监控
```bash
# 安装系统监控工具
sudo apt install htop iotop

# PM2 监控界面
pm2 monit
```

### 2. 定期维护
```bash
# 清理 PM2 日志
pm2 flush

# 更新系统包
sudo apt update && sudo apt upgrade

# 清理磁盘空间
sudo apt autoremove
sudo apt autoclean
```

### 3. 备份
定期备份重要数据：
- 应用代码: `/var/www/qef-chatbot`
- 配置文件: `/etc/nginx/sites-available/qef-chatbot`
- 环境变量: `/var/www/qef-chatbot/.env`

## 更新部署

当您需要更新应用时：

```bash
# 进入项目目录
cd /var/www/qef-chatbot

# 拉取最新代码（如果使用 Git）
git pull

# 安装新依赖
npm install

# 重新构建
npm run build

# 重启应用
pm2 restart qef-chatbot
```

## 支持

如果您在部署过程中遇到问题，请检查：
1. 服务器日志文件
2. PM2 应用日志
3. Nginx 错误日志
4. 系统资源使用情况

需要技术支持时，请提供以上日志信息以便快速诊断问题。
