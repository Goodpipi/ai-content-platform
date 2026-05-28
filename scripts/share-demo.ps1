# 无需 Git：把本机演示暴露为公网链接（需先 npm start）
# 用法：powershell -ExecutionPolicy Bypass -File scripts/share-demo.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$api = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
$web = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

if (-not $web) {
  Write-Host "未检测到 5173 端口。请先在项目目录运行: npm start" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "正在创建公网隧道（localtunnel）..." -ForegroundColor Cyan
Write-Host "保持本窗口不要关闭；同事打开下面显示的 https://xxx.loca.lt 链接" -ForegroundColor Gray
Write-Host "首次访问可能要求输入「隧道密码」= 你电脑的公网 IP，打开 https://ifconfig.me 可查看" -ForegroundColor Gray
Write-Host ""

npx --yes localtunnel --port 5173
