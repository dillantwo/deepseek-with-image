# Nginx 配置测试脚本
# 用于验证3009端口重定向配置

Write-Host "=== Nginx 配置测试 ===" -ForegroundColor Green

# 1. 测试配置语法
Write-Host "`n1. 测试 Nginx 配置语法..." -ForegroundColor Yellow
try {
    $result = nginx -t 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 配置语法正确" -ForegroundColor Green
    } else {
        Write-Host "❌ 配置语法错误:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 无法运行 nginx 命令，请确保 Nginx 已安装" -ForegroundColor Red
    exit 1
}

# 2. 重新加载配置
Write-Host "`n2. 重新加载 Nginx 配置..." -ForegroundColor Yellow
try {
    nginx -s reload
    Write-Host "✅ 配置重新加载成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 配置重新加载失败" -ForegroundColor Red
    exit 1
}

# 3. 测试重定向
Write-Host "`n3. 测试重定向..." -ForegroundColor Yellow

# 检查 Docker 容器状态
Write-Host "检查 Docker 容器状态..." -ForegroundColor Cyan
try {
    $containers = docker ps --format "table {{.Names}}\t{{.Ports}}" | Select-String "3009"
    if ($containers) {
        Write-Host "✅ 发现运行在3009端口的容器:" -ForegroundColor Green
        $containers | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
    } else {
        Write-Host "⚠️  未发现运行在3009端口的容器" -ForegroundColor Yellow
        Write-Host "请确保 Flowise Docker 容器正在运行" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  无法检查 Docker 状态" -ForegroundColor Yellow
}

# 测试 /agent 重定向
Write-Host "`n测试 /agent 重定向..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost/agent" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 301 -or $response.StatusCode -eq 302) {
        $location = $response.Headers.Location
        Write-Host "✅ 重定向正常，目标: $location" -ForegroundColor Green
    }
} catch {
    $response = $_.Exception.Response
    if ($response -and ($response.StatusCode -eq 301 -or $response.StatusCode -eq 302)) {
        $location = $response.Headers.Location
        Write-Host "✅ 重定向正常，目标: $location" -ForegroundColor Green
    } else {
        Write-Host "❌ 重定向测试失败" -ForegroundColor Red
    }
}

# 测试直接访问
Write-Host "`n测试直接访问 /agent/..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost/agent/" -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 直接访问 /agent/ 成功" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  无法访问 /agent/，可能Flowise服务未启动" -ForegroundColor Yellow
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green
Write-Host "如果看到重定向正常，说明配置已生效" -ForegroundColor White
Write-Host "现在可以访问 http://localhost/agent 测试Flowise应用" -ForegroundColor White
