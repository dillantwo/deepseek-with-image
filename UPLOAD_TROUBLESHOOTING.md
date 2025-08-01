# 大文件上傳故障排除指南

## 常見錯誤和解決方案

### 1. 413 Payload Too Large 錯誤

**問題**: 客戶端收到 413 錯誤，表示請求體太大

**解決方案**:
```bash
# 檢查並更新 Nginx 配置
sudo nano /etc/nginx/sites-available/qef-chatbot

# 確保包含以下設置
client_max_body_size 50M;
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

# 重新加載 Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 2. 超時錯誤 (Timeout)

**問題**: 上傳大文件時連接超時

**解決方案**:
```bash
# 檢查 PM2 配置
pm2 show qef-chatbot

# 如需要，重啟應用
pm2 restart qef-chatbot

# 檢查系統資源
free -h
df -h
```

### 3. 內存不足錯誤

**問題**: Node.js 進程因內存不足而崩潰

**解決方案**:
```bash
# 檢查內存使用
pm2 monit

# 增加 Node.js 內存限制
pm2 delete qef-chatbot
pm2 start ecosystem.config.js

# 或直接增加系統內存
```

### 4. 網絡連接中斷

**問題**: 上傳過程中網絡連接中斷

**解決方案**:
- 檢查網絡穩定性
- 考慮分塊上傳大文件
- 添加重試機制

### 5. 文件格式不支持

**問題**: 某些文件格式無法上傳

**解決方案**:
```javascript
// 在前端添加更多支持的文件類型
const supportedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml'
];
```

## 監控和日誌

### 查看實時日誌
```bash
# PM2 日誌
pm2 logs qef-chatbot --lines 100

# Nginx 訪問日誌
sudo tail -f /var/log/nginx/qef-chatbot-access.log

# Nginx 錯誤日誌
sudo tail -f /var/log/nginx/qef-chatbot-error.log

# 系統日誌
sudo journalctl -f -u nginx
```

### 性能監控
```bash
# 檢查 PM2 狀態
pm2 monit

# 檢查系統資源
htop
iotop
```

## 測試大文件上傳

### 使用 curl 測試
```bash
# 創建測試文件 (10MB)
dd if=/dev/zero of=test_10mb.jpg bs=1M count=10

# 測試上傳
curl -X POST \
  -F "files=@test_10mb.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://your-domain.com/api/upload

# 清理測試文件
rm test_10mb.jpg
```

### 使用瀏覽器測試
1. 打開開發者工具
2. 上傳大文件
3. 檢查 Network 標籤中的請求
4. 查看響應時間和錯誤信息

## 優化建議

### 1. 分塊上傳
對於特別大的文件，考慮實現分塊上傳:
```javascript
// 示例：分塊上傳實現
const uploadChunks = async (file, chunkSize = 1024 * 1024) => {
    const chunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        await uploadChunk(chunk, i, chunks);
    }
};
```

### 2. 進度顯示
添加上傳進度顯示：
```javascript
const uploadWithProgress = (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axios.post('/api/upload', formData, {
        onUploadProgress: (progressEvent) => {
            const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
        }
    });
};
```

### 3. 錯誤重試
實現自動重試機制：
```javascript
const uploadWithRetry = async (file, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await uploadFile(file);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * i));
        }
    }
};
```

## 聯繫支持

如果問題持續存在，請提供以下信息：

1. 文件大小和類型
2. 錯誤消息的完整文本
3. 瀏覽器開發者工具中的網絡請求詳情
4. 服務器日誌中的相關錯誤信息
5. 系統配置信息 (運行 `check-upload-config.sh` 腳本的輸出)

## 預防措施

1. **定期監控**: 使用監控工具跟踪上傳成功率和響應時間
2. **容量規劃**: 根據用戶增長預估存儲和帶寬需求
3. **備份策略**: 定期備份上傳的文件和數據庫
4. **安全掃描**: 對上傳的文件進行安全掃描
5. **性能測試**: 定期進行負載測試以確保系統穩定性
