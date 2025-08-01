#!/bin/bash

# 大文件上傳配置檢查腳本

echo "=== QEF ChatBot 大文件上傳配置檢查 ==="
echo ""

# 檢查 Nginx 配置
echo "1. 檢查 Nginx 配置..."
if [ -f /etc/nginx/sites-available/qef-chatbot ]; then
    echo "✓ 找到 Nginx 配置文件"
    
    # 檢查 client_max_body_size
    max_body_size=$(grep -o "client_max_body_size [^;]*" /etc/nginx/sites-available/qef-chatbot | head -1)
    if [[ $max_body_size == *"50M"* ]]; then
        echo "✓ client_max_body_size 已設置為 50M"
    else
        echo "✗ client_max_body_size 設置有問題: $max_body_size"
    fi
    
    # 檢查超時設置
    if grep -q "proxy_read_timeout" /etc/nginx/sites-available/qef-chatbot; then
        echo "✓ 代理超時設置已配置"
    else
        echo "✗ 缺少代理超時設置"
    fi
else
    echo "✗ 未找到 Nginx 配置文件"
fi

echo ""

# 檢查 PM2 狀態
echo "2. 檢查 PM2 應用狀態..."
if command -v pm2 &> /dev/null; then
    pm2_status=$(pm2 jlist)
    if [[ $pm2_status == *"qef-chatbot"* ]]; then
        echo "✓ PM2 應用運行中"
        pm2 show qef-chatbot --no-colors | grep -E "(memory|restart|uptime)"
    else
        echo "✗ PM2 應用未運行"
    fi
else
    echo "✗ PM2 未安裝"
fi

echo ""

# 檢查磁盤空間
echo "3. 檢查磁盤空間..."
disk_usage=$(df -h /var/www/qef-chatbot 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
if [ -n "$disk_usage" ] && [ "$disk_usage" -lt 80 ]; then
    echo "✓ 磁盤空間充足 (已使用 ${disk_usage}%)"
else
    echo "⚠ 磁盤空間可能不足 (已使用 ${disk_usage}%)"
fi

echo ""

# 檢查內存使用
echo "4. 檢查系統內存..."
total_mem=$(free -m | awk 'NR==2{printf "%.1f", $2/1024}')
used_mem=$(free -m | awk 'NR==2{printf "%.1f", $3/1024}')
echo "總內存: ${total_mem}GB, 已使用: ${used_mem}GB"

if (( $(echo "$total_mem >= 2.0" | bc -l) )); then
    echo "✓ 內存充足"
else
    echo "⚠ 內存可能不足，建議至少 2GB"
fi

echo ""

# 測試文件上傳端點
echo "5. 測試上傳端點..."
if command -v curl &> /dev/null; then
    # 創建一個測試文件
    test_file="/tmp/test_upload.txt"
    echo "This is a test file for upload testing" > $test_file
    
    # 測試上傳
    response=$(curl -s -w "%{http_code}" -X POST \
        -F "files=@$test_file" \
        http://localhost:3000/api/upload \
        -o /tmp/upload_test_response.json)
    
    if [ "$response" = "200" ]; then
        echo "✓ 上傳端點工作正常"
    else
        echo "✗ 上傳端點測試失敗 (HTTP $response)"
        if [ -f /tmp/upload_test_response.json ]; then
            echo "響應內容:"
            cat /tmp/upload_test_response.json
        fi
    fi
    
    # 清理測試文件
    rm -f $test_file /tmp/upload_test_response.json
else
    echo "⚠ curl 未安裝，無法測試上傳端點"
fi

echo ""

# 檢查 Node.js 版本
echo "6. 檢查 Node.js 環境..."
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo "Node.js 版本: $node_version"
    
    if [[ $node_version == v1[89]* ]] || [[ $node_version == v2[0-9]* ]]; then
        echo "✓ Node.js 版本符合要求"
    else
        echo "⚠ Node.js 版本可能過舊，建議使用 v18 或更高版本"
    fi
else
    echo "✗ Node.js 未安裝"
fi

echo ""

# 檢查錯誤日誌
echo "7. 檢查最近的錯誤日誌..."
if [ -f /var/log/pm2/qef-chatbot-error.log ]; then
    recent_errors=$(tail -20 /var/log/pm2/qef-chatbot-error.log | grep -i "error\|timeout\|413\|payload" | wc -l)
    if [ "$recent_errors" -eq 0 ]; then
        echo "✓ 最近沒有上傳相關錯誤"
    else
        echo "⚠ 發現 $recent_errors 個最近的錯誤，請檢查日誌"
        echo "最近的錯誤："
        tail -10 /var/log/pm2/qef-chatbot-error.log | grep -i "error\|timeout\|413\|payload" | tail -3
    fi
else
    echo "⚠ 未找到 PM2 錯誤日誌文件"
fi

echo ""
echo "=== 檢查完成 ==="

# 提供修復建議
echo ""
echo "如果發現問題，請執行以下命令修復："
echo ""
echo "重新加載 Nginx 配置："
echo "sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "重啟 PM2 應用："
echo "pm2 restart qef-chatbot"
echo ""
echo "查看詳細日誌："
echo "pm2 logs qef-chatbot --lines 50"
