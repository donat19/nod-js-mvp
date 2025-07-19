# Quick PostgreSQL Password Reset - Manual Steps
# Run this in Administrator PowerShell

Write-Host "===============================================" -ForegroundColor Green
Write-Host "Manual PostgreSQL Password Reset Instructions" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    exit 1
}

$pgHbaPath = "C:\Program Files\PostgreSQL\17\data\pg_hba.conf"

Write-Host "`n1. Stopping PostgreSQL..." -ForegroundColor Yellow
try {
    Stop-Service postgresql-x64-17 -Force
    Write-Host "   ✅ PostgreSQL stopped" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error stopping PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Current pg_hba.conf authentication lines:" -ForegroundColor Yellow
$content = Get-Content $pgHbaPath
$hostLines = $content | Where-Object { $_ -match "^host" -and $_ -notmatch "^#" }
if ($hostLines) {
    $hostLines | ForEach-Object { Write-Host "   $_" -ForegroundColor Cyan }
} else {
    Write-Host "   No active host lines found" -ForegroundColor Red
}

Write-Host "`n3. Backing up and modifying pg_hba.conf..." -ForegroundColor Yellow
try {
    # Backup
    Copy-Item $pgHbaPath "$pgHbaPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force
    
    # Read content
    $content = Get-Content $pgHbaPath
    
    # Replace all authentication methods with trust for localhost
    $newContent = @()
    foreach ($line in $content) {
        if ($line -match "^host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+\w+") {
            if ($line -match "127\.0\.0\.1/32") {
                $newLine = "host all all 127.0.0.1/32 trust"
            } else {
                $newLine = "host all all ::1/128 trust"
            }
            Write-Host "   Changing: $line" -ForegroundColor Red
            Write-Host "   To:       $newLine" -ForegroundColor Green
            $newContent += $newLine
        } elseif ($line -match "^host\s+\w+\s+postgres\s+(127\.0\.0\.1/32|::1/128)\s+\w+") {
            if ($line -match "127\.0\.0\.1/32") {
                $newLine = "host all postgres 127.0.0.1/32 trust"
            } else {
                $newLine = "host all postgres ::1/128 trust"
            }
            Write-Host "   Changing: $line" -ForegroundColor Red
            Write-Host "   To:       $newLine" -ForegroundColor Green
            $newContent += $newLine
        } else {
            $newContent += $line
        }
    }
    
    # Write modified content
    $newContent | Set-Content $pgHbaPath
    Write-Host "   ✅ pg_hba.conf modified" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Error modifying pg_hba.conf: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n4. Starting PostgreSQL..." -ForegroundColor Yellow
try {
    Start-Service postgresql-x64-17
    Start-Sleep -Seconds 3
    Write-Host "   ✅ PostgreSQL started" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error starting PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n5. Attempting to connect and reset password..." -ForegroundColor Yellow
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

try {
    Write-Host "   Resetting postgres user password..." -ForegroundColor Cyan
    & $psqlPath -h localhost -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'postgres';" 2>&1 | Write-Host
    
    Write-Host "   Creating automax_db database..." -ForegroundColor Cyan
    & $psqlPath -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS automax_db;" 2>&1 | Write-Host
    & $psqlPath -h localhost -U postgres -d postgres -c "CREATE DATABASE automax_db;" 2>&1 | Write-Host
    
    Write-Host "   ✅ Password reset and database created" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Error during database operations: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   You may need to run the psql commands manually" -ForegroundColor Yellow
}

Write-Host "`n6. Restoring pg_hba.conf security..." -ForegroundColor Yellow
try {
    Stop-Service postgresql-x64-17 -Force
    
    # Restore security - change trust back to md5
    $content = Get-Content $pgHbaPath
    $secureContent = @()
    foreach ($line in $content) {
        if ($line -match "^host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+trust") {
            $secureLine = $line -replace "trust", "md5"
            $secureContent += $secureLine
        } elseif ($line -match "^host\s+all\s+postgres\s+(127\.0\.0\.1/32|::1/128)\s+trust") {
            $secureLine = $line -replace "trust", "md5"
            $secureContent += $secureLine
        } else {
            $secureContent += $line
        }
    }
    $secureContent | Set-Content $pgHbaPath
    
    Start-Service postgresql-x64-17
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Security restored and PostgreSQL restarted" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Error restoring security: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n===============================================" -ForegroundColor Green
Write-Host "Password Reset Complete!" -ForegroundColor Green
Write-Host "Username: postgres" -ForegroundColor Cyan
Write-Host "Password: postgres" -ForegroundColor Cyan
Write-Host "Database: automax_db" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Green

Write-Host "`nTesting connection..." -ForegroundColor Yellow
$env:PGPASSWORD = "postgres"
try {
    $testResult = & $psqlPath -h localhost -U postgres -d automax_db -c "SELECT 'Connection successful!' as status;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connection test PASSED!" -ForegroundColor Green
    } else {
        Write-Host "❌ Connection test FAILED!" -ForegroundColor Red
        Write-Host $testResult -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Connection test ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "`nPress Enter to exit"
