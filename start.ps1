# ============================================
# QualiQA - Script de Inicializacao
# ============================================
# Uso: Abra o PowerShell e execute:
#   .\start.ps1
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   QualiQA - Iniciando Servicos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backend Node.js (porta 3001)
Write-Host "[1/3] Iniciando Backend Node.js (porta 3001)..." -ForegroundColor Yellow
$nodeCmd = "Set-Location '$PSScriptRoot\backend-node'; Write-Host '=== QualiQA Node API ===' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $nodeCmd -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Backend Python FastAPI (porta 8000)
Write-Host "[2/3] Iniciando Backend Python FastAPI (porta 8000)..." -ForegroundColor Yellow
$pythonCmd = "Set-Location '$PSScriptRoot\backend-python'; Write-Host '=== QualiQA Python API ===' -ForegroundColor Green; py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $pythonCmd -WindowStyle Normal

Start-Sleep -Seconds 2

# 3. Frontend React (porta 5173)
Write-Host "[3/3] Iniciando Frontend React (porta 5173)..." -ForegroundColor Yellow
$frontCmd = "Set-Location '$PSScriptRoot\frontend'; Write-Host '=== QualiQA Frontend ===' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontCmd -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Todos os servicos iniciados!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "  Node API:   http://localhost:3001" -ForegroundColor White
Write-Host "  Python API: http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "  Para parar, feche as 3 janelas do PowerShell." -ForegroundColor Gray
Write-Host ""

# Abre o navegador automaticamente
Start-Process "http://localhost:5173"
