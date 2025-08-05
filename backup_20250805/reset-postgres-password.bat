@echo off
echo ===================================
echo PostgreSQL Password Reset Script
echo ===================================
echo.
echo This script will reset your PostgreSQL password
echo Run this as Administrator!
echo.

echo Step 1: Stopping PostgreSQL service...
net stop postgresql-x64-17
if %errorlevel% neq 0 (
    echo ERROR: Could not stop PostgreSQL service. Make sure you're running as Administrator.
    pause
    exit /b 1
)

echo Step 2: Backing up pg_hba.conf...
copy "C:\Program Files\PostgreSQL\17\data\pg_hba.conf" "C:\Program Files\PostgreSQL\17\data\pg_hba.conf.backup"

echo Step 3: Modifying pg_hba.conf to allow passwordless connection...
powershell -Command "(Get-Content 'C:\Program Files\PostgreSQL\17\data\pg_hba.conf') -replace 'host.*all.*all.*127.0.0.1/32.*md5', 'host all all 127.0.0.1/32 trust' | Set-Content 'C:\Program Files\PostgreSQL\17\data\pg_hba.conf'"

echo Step 4: Starting PostgreSQL service...
net start postgresql-x64-17

echo Step 5: Connecting to PostgreSQL and resetting password...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'postgres';"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -U postgres -d postgres -c "CREATE DATABASE IF NOT EXISTS automax_db;"

echo Step 6: Stopping PostgreSQL service again...
net stop postgresql-x64-17

echo Step 7: Restoring pg_hba.conf security...
copy "C:\Program Files\PostgreSQL\17\data\pg_hba.conf.backup" "C:\Program Files\PostgreSQL\17\data\pg_hba.conf"

echo Step 8: Starting PostgreSQL service with restored security...
net start postgresql-x64-17

echo.
echo ===================================
echo Password reset complete!
echo Username: postgres
echo Password: postgres
echo Database: automax_db (created)
echo ===================================
echo.
echo You can now test the connection with:
echo psql -h localhost -U postgres -d automax_db
echo.
pause
