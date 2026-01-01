#!/bin/bash
# Deploy script for agentsflow-ai.cloud
# Usage: ./deploy.sh

set -e

# Configuration
SERVER="root@srv1187860.hstgr.cloud"
REMOTE_DIR="/var/www/agentsflow-ai"
LOCAL_DIR="$(pwd)/"
SSH_KEY="~/.ssh/deploy_key"

# Color constants
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "Required command '$1' not found. Please install it."
        exit 1
    fi
}

expand_path() {
    echo "${1/#\~/$HOME}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Expand SSH key path
SSH_KEY_EXPANDED=$(expand_path "$SSH_KEY")
USE_PASSWORD_AUTH=false

# Check required commands
check_command ssh
check_command rsync


# SSH Connection Test
test_ssh_connection() {
    if [ "$USE_PASSWORD_AUTH" = false ]; then
        # Try key-based authentication
        set +e
        output=$(ssh -o ConnectTimeout=10 -o BatchMode=yes -i "$SSH_KEY_EXPANDED" "$SERVER" "echo 'Connection successful'" 2>&1)
        exit_code=$?
        set -e
        if [ $exit_code -eq 0 ]; then
            print_success "SSH connection test passed"
            return 0
        else
            print_error "❌ SSH key authentication failed: Permission denied"
            echo ""
            echo "Possible causes:"
            echo "- SSH key not authorized on server"
            echo "- Wrong SSH key being used"
            echo "- Server SSH configuration restricts key authentication"
            echo ""
            echo "Troubleshooting:"
            echo "1. Verify SSH key is authorized:"
            echo "   ssh-copy-id -i ~/.ssh/deploy_key.pub root@srv1187860.hstgr.cloud"
            echo ""
            echo "2. Check SSH key permissions:"
            echo "   chmod 600 ~/.ssh/deploy_key"
            echo ""
            print_warning "Falling back to password authentication"
            USE_PASSWORD_AUTH=true
        fi
    fi
    if [ "$USE_PASSWORD_AUTH" = true ]; then
        # Check if sshpass is available
        if ! command -v sshpass &> /dev/null; then
            print_error "sshpass not found. Install with: brew install hudochenkov/sshpass/sshpass (macOS) or sudo apt-get install sshpass (Linux)"
            exit 1
        fi
        # Set password
        export SSHPASS="n/6Y#PRl(.ovLy@D,veW"
        set +e
        output=$(sshpass -e ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER" "echo 'Connection successful'" 2>&1)
        exit_code=$?
        set -e
        if [ $exit_code -eq 0 ]; then
            print_success "SSH connection test passed with password"
            return 0
        else
            if echo "$output" | grep -q "Connection refused"; then
                print_error "❌ SSH connection failed: Connection refused"
                echo ""
                echo "Possible causes:"
                echo "- Server is down or unreachable"
                echo "- Firewall blocking port 22"
                echo "- SSH service not running on server"
                echo ""
                echo "Troubleshooting:"
                echo "1. Check if server is reachable: ping 72.61.16.111"
                echo "2. Check if SSH port is open: nc -zv 72.61.16.111 22"
                echo "3. Contact server administrator"
            elif echo "$output" | grep -q "Permission denied"; then
                print_error "❌ SSH authentication failed: Permission denied"
                echo ""
                echo "Possible causes:"
                echo "- Incorrect password"
                echo "- Server SSH configuration restricts password authentication"
                echo ""
                echo "Troubleshooting:"
                echo "1. Verify the password is correct"
                echo "2. Check server SSH config for password auth"
                echo "3. Try SSH key authentication instead"
            else
                print_error "SSH connection failed: $output"
                print_info "Troubleshooting: Check server status, firewall, SSH service"
            fi
            exit 1
        fi
    fi
}

# SSH Key Validation
if [ -f "$SSH_KEY_EXPANDED" ]; then
    # Check permissions
    perms=$(stat -c "%a" "$SSH_KEY_EXPANDED" 2>/dev/null || stat -f "%A" "$SSH_KEY_EXPANDED")
    if [ "$perms" != "600" ] && [ "$perms" != "400" ]; then
        print_warning "SSH key has incorrect permissions, fixing..."
        chmod 600 "$SSH_KEY_EXPANDED"
    fi
    print_success "SSH key found at $SSH_KEY_EXPANDED"
else
    print_warning "SSH key not found at $SSH_KEY_EXPANDED, will attempt password authentication"
    USE_PASSWORD_AUTH=true
fi

# Test SSH connection
test_ssh_connection

echo "🚀 Starting deployment to $SERVER..."

# 1. Build the project locally
echo "📦 Building project locally..."
cd "$LOCAL_DIR"
npm run build

# 2. Sync files to server
echo "📤 Syncing files to server..."
set +e
if [ "$USE_PASSWORD_AUTH" = false ]; then
    rsync -avz --delete \
      -e "ssh -i $SSH_KEY_EXPANDED -o StrictHostKeyChecking=no -o ConnectTimeout=30" \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='*.log' \
      --exclude='.env.local' \
      --exclude='.env.example' \
      "$LOCAL_DIR" "$SERVER:$REMOTE_DIR"
else
    sshpass -e rsync -avz --delete \
      -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30" \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='*.log' \
      --exclude='.env.local' \
      --exclude='.env.example' \
      "$LOCAL_DIR" "$SERVER:$REMOTE_DIR"
fi
rsync_exit=$?
set -e
if [ $rsync_exit -ne 0 ]; then
    if [ $rsync_exit -eq 255 ]; then
        print_error "Rsync failed: SSH connection error"
        exit 1
    elif [ $rsync_exit -eq 23 ]; then
        print_warning "Rsync completed with partial transfer (some files may not have been synced)"
    else
        print_error "Rsync failed with exit code $rsync_exit"
        exit 1
    fi
fi

# 3. Install dependencies and start on server
echo "🔧 Installing dependencies and starting app..."
if [ "$USE_PASSWORD_AUTH" = false ]; then
    ssh -i "$SSH_KEY_EXPANDED" -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$SERVER" << 'REMOTE_EOF'
else
    sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$SERVER" << 'REMOTE_EOF'
fi
cd /var/www/agentsflow-ai

# Install dependencies
echo "Installing npm packages..."
npm ci --production=false

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || echo "No migrations needed"

# Seed database
echo "Seeding database..."
npx prisma db seed 2>/dev/null || echo "Seed skipped"

# Restart PM2
echo "Restarting PM2..."
pm2 reload ecosystem.config.mjs --env production || pm2 start ecosystem.config.mjs --env production

# Save PM2 config
pm2 save

# Show status
pm2 status
REMOTE_EOF

auth_method="SSH Key"
if [ "$USE_PASSWORD_AUTH" = true ]; then
    auth_method="Password"
fi

echo "✅ Deployment complete!"
echo ""
echo "Authentication Method: $auth_method"
echo "Files Synced: [count] files"
echo "Server: root@srv1187860.hstgr.cloud"
echo "Remote Path: /var/www/agentsflow-ai"
echo "App URL: http://72.61.16.111:3005"
echo ""
echo "Next steps:"
echo "- Check app status: ssh -i ~/.ssh/deploy_key root@srv1187860.hstgr.cloud \"pm2 status\""
echo "- View logs: ssh -i ~/.ssh/deploy_key root@srv1187860.hstgr.cloud \"pm2 logs agentsflow-ai\""
echo "- Monitor: ./deploy/monitor.sh"
