@echo off
REM
REM Admin Access Management for Windows
REM Secure administration helper script
REM

setlocal enabledelayedexpansion

REM Set script directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."

REM Function to print colored output (Windows doesn't support colors easily, so using symbols)
goto :main

:print_header
echo.
echo ================================================
echo   AutoMax Admin Access Management
echo ================================================
echo.
goto :eof

:generate_admin_access
set duration=%1
if "%duration%"=="" set duration=30

call :print_header
echo [INFO] Generating secure admin access token...
echo [INFO] Duration: %duration% minutes
echo.

REM Check if Node.js script exists
if not exist "%PROJECT_DIR%\scripts\generate-admin-access.js" (
    echo [ERROR] Admin access generator script not found!
    exit /b 1
)

REM Run the Node.js script
cd /d "%PROJECT_DIR%"
node scripts\generate-admin-access.js %duration%
goto :eof

:show_admin_status
call :print_header
echo [INFO] Checking admin security status...
echo.

cd /d "%PROJECT_DIR%"
node -e "const { query } = require('./config/database'); async function checkStatus() { try { const tokens = await query('SELECT COUNT(*) as count FROM admin_access_tokens WHERE expires_at > NOW() AND used = false'); const usedTokens = await query('SELECT COUNT(*) as count FROM admin_access_tokens WHERE used = true'); const sessions = await query('SELECT COUNT(*) as count FROM admin_sessions WHERE is_active = true AND expires_at > NOW()'); console.log('Admin Security Status:'); console.log('  Active tokens:', tokens.rows[0].count); console.log('  Used tokens:', usedTokens.rows[0].count); console.log('  Active sessions:', sessions.rows[0].count); const latest = await query('SELECT created_at, expires_at FROM admin_access_tokens ORDER BY created_at DESC LIMIT 1'); if (latest.rows.length > 0) { console.log('  Last token generated:', new Date(latest.rows[0].created_at).toLocaleString()); console.log('  Token expires:', new Date(latest.rows[0].expires_at).toLocaleString()); } process.exit(0); } catch (error) { console.error('Error checking status:', error.message); process.exit(1); } } checkStatus();"
goto :eof

:cleanup_admin_tokens
call :print_header
echo [INFO] Cleaning up expired admin tokens and sessions...
echo.

cd /d "%PROJECT_DIR%"
node -e "const { query } = require('./config/database'); async function cleanup() { try { const expiredTokens = await query('DELETE FROM admin_access_tokens WHERE expires_at < NOW() - INTERVAL ''24 hours'' RETURNING id'); const expiredSessions = await query('DELETE FROM admin_sessions WHERE expires_at < NOW() - INTERVAL ''24 hours'' RETURNING id'); const oldLogs = await query('DELETE FROM admin_activity_log WHERE created_at < NOW() - INTERVAL ''30 days'' RETURNING id'); console.log('Cleanup completed:'); console.log('  Removed expired tokens:', expiredTokens.rows.length); console.log('  Removed expired sessions:', expiredSessions.rows.length); console.log('  Removed old activity logs:', oldLogs.rows.length); process.exit(0); } catch (error) { console.error('Error during cleanup:', error.message); process.exit(1); } } cleanup();"
goto :eof

:revoke_all_sessions
call :print_header
echo [INFO] Revoking all active admin sessions...
echo.

set /p confirm="Are you sure you want to revoke ALL admin sessions? (y/N): "
if /i not "%confirm%"=="y" (
    echo [INFO] Operation cancelled.
    goto :eof
)

cd /d "%PROJECT_DIR%"
node -e "const { query } = require('./config/database'); async function revokeAll() { try { const result = await query('UPDATE admin_sessions SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_reason = ''Bulk revocation from terminal'' WHERE is_active = true RETURNING id'); console.log('Revoked', result.rows.length, 'active admin sessions'); await query('INSERT INTO admin_activity_log (action, details, success) VALUES (''BULK_SESSION_REVOCATION'', ''{\"count\": ' + result.rows.length + ', \"source\": \"terminal\"}'', true)'); process.exit(0); } catch (error) { console.error('Error revoking sessions:', error.message); process.exit(1); } } revokeAll();"
goto :eof

:show_recent_activity
set limit=%1
if "%limit%"=="" set limit=20

call :print_header
echo [INFO] Recent admin activity (last %limit% actions):
echo.

cd /d "%PROJECT_DIR%"
node -e "const { query } = require('./config/database'); async function showActivity() { try { const result = await query('SELECT l.action, l.ip_address, l.success, l.created_at, u.name as admin_name FROM admin_activity_log l LEFT JOIN users u ON l.admin_user_id = u.id ORDER BY l.created_at DESC LIMIT %limit%'); console.log('Recent Admin Activity:'); console.log('='.repeat(80)); result.rows.forEach(row => { const status = row.success ? 'OK' : 'FAIL'; const date = new Date(row.created_at).toLocaleString(); const admin = row.admin_name || 'System'; console.log(status + ' | ' + date + ' | ' + admin + ' | ' + row.action + ' | ' + (row.ip_address || 'N/A')); }); if (result.rows.length === 0) { console.log('No recent activity found.'); } process.exit(0); } catch (error) { console.error('Error fetching activity:', error.message); process.exit(1); } } showActivity();"
goto :eof

:show_help
call :print_header
echo Available Commands:
echo.
echo   generate [duration]     Generate secure admin access token
echo                          Duration in minutes (default: 30, max: 120)
echo.
echo   status                 Show admin security status
echo.
echo   activity [limit]       Show recent admin activity (default: 20)
echo.
echo   cleanup                Clean up expired tokens and sessions
echo.
echo   revoke-all             Revoke all active admin sessions
echo.
echo   help                   Show this help message
echo.
echo Examples:
echo   %~nx0 generate 60      Generate token valid for 1 hour
echo   %~nx0 status           Check current security status
echo   %~nx0 activity 50      Show last 50 admin actions
echo   %~nx0 cleanup          Clean up expired data
echo.
goto :eof

:main
REM Main script logic
if "%1"=="generate" (
    call :generate_admin_access %2
) else if "%1"=="status" (
    call :show_admin_status
) else if "%1"=="activity" (
    call :show_recent_activity %2
) else if "%1"=="cleanup" (
    call :cleanup_admin_tokens
) else if "%1"=="revoke-all" (
    call :revoke_all_sessions
) else if "%1"=="help" (
    call :show_help
) else if "%1"=="--help" (
    call :show_help
) else if "%1"=="-h" (
    call :show_help
) else if "%1"=="" (
    REM No arguments, default to generating token
    call :generate_admin_access
) else (
    echo [ERROR] Unknown command: %1
    echo.
    call :show_help
    exit /b 1
)
