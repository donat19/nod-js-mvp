#!/bin/bash

#
# Admin Access Management Scripts
# Secure administration helper scripts
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_colored() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print header
print_header() {
    echo
    print_colored $BLUE "================================================"
    print_colored $BLUE "  AutoMax Admin Access Management"
    print_colored $BLUE "================================================"
    echo
}

# Function to generate admin access token
generate_admin_access() {
    local duration=${1:-30}
    
    print_header
    print_colored $YELLOW "Generating secure admin access token..."
    print_colored $YELLOW "Duration: ${duration} minutes"
    echo
    
    # Check if Node.js script exists
    if [ ! -f "$PROJECT_DIR/scripts/generate-admin-access.js" ]; then
        print_colored $RED "Error: Admin access generator script not found!"
        exit 1
    fi
    
    # Run the Node.js script
    cd "$PROJECT_DIR"
    node scripts/generate-admin-access.js "$duration"
}

# Function to show admin security status
show_admin_status() {
    print_header
    print_colored $YELLOW "Checking admin security status..."
    echo
    
    # Check database connection and query admin status
    cd "$PROJECT_DIR"
    node -e "
    const { query } = require('./config/database');
    
    async function checkStatus() {
        try {
            // Check active tokens
            const tokens = await query('SELECT COUNT(*) as count FROM admin_access_tokens WHERE expires_at > NOW() AND used = false');
            const usedTokens = await query('SELECT COUNT(*) as count FROM admin_access_tokens WHERE used = true');
            const sessions = await query('SELECT COUNT(*) as count FROM admin_sessions WHERE is_active = true AND expires_at > NOW()');
            
            console.log('📊 Admin Security Status:');
            console.log('  🔑 Active tokens:', tokens.rows[0].count);
            console.log('  ✅ Used tokens:', usedTokens.rows[0].count);
            console.log('  🔐 Active sessions:', sessions.rows[0].count);
            
            // Get latest token info
            const latest = await query('SELECT created_at, expires_at FROM admin_access_tokens ORDER BY created_at DESC LIMIT 1');
            if (latest.rows.length > 0) {
                console.log('  📅 Last token generated:', new Date(latest.rows[0].created_at).toLocaleString());
                console.log('  ⏰ Token expires:', new Date(latest.rows[0].expires_at).toLocaleString());
            }
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error checking status:', error.message);
            process.exit(1);
        }
    }
    
    checkStatus();
    "
}

# Function to cleanup expired tokens
cleanup_admin_tokens() {
    print_header
    print_colored $YELLOW "Cleaning up expired admin tokens and sessions..."
    echo
    
    cd "$PROJECT_DIR"
    node -e "
    const { query } = require('./config/database');
    
    async function cleanup() {
        try {
            // Cleanup expired tokens
            const expiredTokens = await query('DELETE FROM admin_access_tokens WHERE expires_at < NOW() - INTERVAL \\'24 hours\\' RETURNING id');
            
            // Cleanup expired sessions
            const expiredSessions = await query('DELETE FROM admin_sessions WHERE expires_at < NOW() - INTERVAL \\'24 hours\\' RETURNING id');
            
            // Cleanup old activity logs (keep 30 days)
            const oldLogs = await query('DELETE FROM admin_activity_log WHERE created_at < NOW() - INTERVAL \\'30 days\\' RETURNING id');
            
            console.log('🧹 Cleanup completed:');
            console.log('  🗑️  Removed expired tokens:', expiredTokens.rows.length);
            console.log('  🗑️  Removed expired sessions:', expiredSessions.rows.length);
            console.log('  🗑️  Removed old activity logs:', oldLogs.rows.length);
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
            process.exit(1);
        }
    }
    
    cleanup();
    "
}

# Function to revoke all admin sessions
revoke_all_sessions() {
    print_header
    print_colored $YELLOW "Revoking all active admin sessions..."
    echo
    
    read -p "Are you sure you want to revoke ALL admin sessions? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_colored $YELLOW "Operation cancelled."
        exit 0
    fi
    
    cd "$PROJECT_DIR"
    node -e "
    const { query } = require('./config/database');
    
    async function revokeAll() {
        try {
            const result = await query(\`
                UPDATE admin_sessions 
                SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'Bulk revocation from terminal'
                WHERE is_active = true
                RETURNING id
            \`);
            
            console.log('🚫 Revoked', result.rows.length, 'active admin sessions');
            
            // Log the bulk revocation
            await query(\`
                INSERT INTO admin_activity_log (action, details, success)
                VALUES ('BULK_SESSION_REVOCATION', '{\"count\": \${result.rows.length}, \"source\": \"terminal\"}', true)
            \`);
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error revoking sessions:', error.message);
            process.exit(1);
        }
    }
    
    revokeAll();
    "
}

# Function to show recent admin activity
show_recent_activity() {
    local limit=${1:-20}
    
    print_header
    print_colored $YELLOW "Recent admin activity (last ${limit} actions):"
    echo
    
    cd "$PROJECT_DIR"
    node -e "
    const { query } = require('./config/database');
    
    async function showActivity() {
        try {
            const result = await query(\`
                SELECT 
                    l.action, 
                    l.ip_address, 
                    l.success,
                    l.created_at,
                    u.name as admin_name
                FROM admin_activity_log l
                LEFT JOIN users u ON l.admin_user_id = u.id
                ORDER BY l.created_at DESC
                LIMIT \${$limit}
            \`);
            
            console.log('📋 Recent Admin Activity:');
            console.log('=' .repeat(80));
            
            result.rows.forEach(row => {
                const status = row.success ? '✅' : '❌';
                const date = new Date(row.created_at).toLocaleString();
                const admin = row.admin_name || 'System';
                console.log(\`\${status} \${date} | \${admin} | \${row.action} | \${row.ip_address || 'N/A'}\`);
            });
            
            if (result.rows.length === 0) {
                console.log('No recent activity found.');
            }
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error fetching activity:', error.message);
            process.exit(1);
        }
    }
    
    showActivity();
    "
}

# Function to show help
show_help() {
    print_header
    print_colored $GREEN "Available Commands:"
    echo
    print_colored $BLUE "  generate [duration]     Generate secure admin access token"
    print_colored $BLUE "                         Duration in minutes (default: 30, max: 120)"
    echo
    print_colored $BLUE "  status                 Show admin security status"
    echo
    print_colored $BLUE "  activity [limit]       Show recent admin activity (default: 20)"
    echo
    print_colored $BLUE "  cleanup                Clean up expired tokens and sessions"
    echo
    print_colored $BLUE "  revoke-all             Revoke all active admin sessions"
    echo
    print_colored $BLUE "  help                   Show this help message"
    echo
    print_colored $YELLOW "Examples:"
    print_colored $YELLOW "  $0 generate 60         # Generate token valid for 1 hour"
    print_colored $YELLOW "  $0 status              # Check current security status"
    print_colored $YELLOW "  $0 activity 50         # Show last 50 admin actions"
    print_colored $YELLOW "  $0 cleanup             # Clean up expired data"
    echo
}

# Main script logic
case "$1" in
    "generate")
        generate_admin_access "$2"
        ;;
    "status")
        show_admin_status
        ;;
    "activity")
        show_recent_activity "$2"
        ;;
    "cleanup")
        cleanup_admin_tokens
        ;;
    "revoke-all")
        revoke_all_sessions
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        # No arguments, default to generating token
        generate_admin_access
        ;;
    *)
        print_colored $RED "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac
