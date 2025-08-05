# PostgreSQL Password Reset Script
# Run this in PowerShell as Administrator

Write-Host "====================================" -ForegroundColor Green
Write-Host "PostgreSQL Password Reset Script" -ForegroundColor Green  
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    Write-Host "Step 1: Stopping PostgreSQL service..." -ForegroundColor Yellow
    Stop-Service postgresql-x64-17 -Force
    Start-Sleep -Seconds 2

    $pgDataPath = "C:\Program Files\PostgreSQL\17\data"
    $pgHbaPath = "$pgDataPath\pg_hba.conf"
    $pgHbaBackup = "$pgDataPath\pg_hba.conf.backup"

    Write-Host "Step 2: Backing up pg_hba.conf..." -ForegroundColor Yellow
    Copy-Item $pgHbaPath $pgHbaBackup -Force

    Write-Host "Step 3: Modifying pg_hba.conf to allow passwordless connection..." -ForegroundColor Yellow
    $content = Get-Content $pgHbaPath
    
    # Show current content for debugging
    Write-Host "Current pg_hba.conf lines with 'host':" -ForegroundColor Cyan
    $content | Where-Object { $_ -match "^host" } | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    # More comprehensive replacement - replace any authentication method with trust
    $newContent = $content -replace "^host\s+all\s+all\s+127\.0\.0\.1/32\s+\w+", "host all all 127.0.0.1/32 trust"
    $newContent = $newContent -replace "^host\s+all\s+all\s+::1/128\s+\w+", "host all all ::1/128 trust"
    $newContent = $newContent -replace "^host\s+all\s+postgres\s+127\.0\.0\.1/32\s+\w+", "host all postgres 127.0.0.1/32 trust"
    $newContent = $newContent -replace "^host\s+all\s+postgres\s+::1/128\s+\w+", "host all postgres ::1/128 trust"
    
    $newContent | Set-Content $pgHbaPath
    
    Write-Host "Modified pg_hba.conf lines with 'host':" -ForegroundColor Cyan
    $newContent | Where-Object { $_ -match "^host" } | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

    Write-Host "Step 4: Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service postgresql-x64-17
    Start-Sleep -Seconds 3

    Write-Host "Step 5: Resetting password and creating database..." -ForegroundColor Yellow
    $psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
    
    & $psqlPath -h localhost -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'postgres';"
    & $psqlPath -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS automax_db;"
    & $psqlPath -h localhost -U postgres -d postgres -c "CREATE DATABASE automax_db;"

    Write-Host "Step 6: Stopping PostgreSQL service..." -ForegroundColor Yellow
    Stop-Service postgresql-x64-17 -Force
    Start-Sleep -Seconds 2

    Write-Host "Step 7: Restoring pg_hba.conf security..." -ForegroundColor Yellow
    Copy-Item $pgHbaBackup $pgHbaPath -Force

    Write-Host "Step 8: Starting PostgreSQL service with restored security..." -ForegroundColor Yellow
    Start-Service postgresql-x64-17
    Start-Sleep -Seconds 2

    Write-Host ""
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "Password reset completed successfully!" -ForegroundColor Green
    Write-Host "Username: postgres" -ForegroundColor Cyan
    Write-Host "Password: postgres" -ForegroundColor Cyan  
    Write-Host "Database: automax_db" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Green

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Attempting to restore original configuration..." -ForegroundColor Yellow
    
    try {
        Stop-Service postgresql-x64-17 -Force -ErrorAction SilentlyContinue
        if (Test-Path $pgHbaBackup) {
            Copy-Item $pgHbaBackup $pgHbaPath -Force
        }
        Start-Service postgresql-x64-17 -ErrorAction SilentlyContinue
    } catch {
        Write-Host "Could not restore configuration. Please restore manually." -ForegroundColor Red
    }
}

Read-Host "`nPress Enter to exit"
