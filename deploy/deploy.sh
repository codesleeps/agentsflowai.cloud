#!/bin/bash
# ===========================================
# AgentsFlowAI - Deployment Script
# ===========================================
# Run this script to deploy updates
# Usage: ./deploy.sh [branch]
# ===========================================

set -e

# Configuration
APP_DIR="/var/www/agentsflow-ai"
APP_NAME="agentsflow-ai"
BRANCH="${1:-main}"
BACKUP_DIR="/var/backups/agentsflow-ai"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================="
echo " Deploying AgentsFlowAI"
echo " Branch: $BRANCH"
echo "============================================="

cd $APP_DIR

# ===========================================
# 1. Create Backup
# ===========================================
log_info "Creating backup..."
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
if [ -d ".next" ]; then
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" .next package.json 2>/dev/null || true
    log_info "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
fi

# ===========================================
# 2. Pull Latest Code
# ===========================================
log_info "Pulling latest code from $BRANCH..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# ===========================================
# 3. Install Dependencies
# ===========================================
log_info "Installing dependencies..."
npm ci --production=false

# ===========================================
# 4. Build Application
# ===========================================
log_info "Building application..."
npm run build

# ===========================================
# 5. Restart PM2
# ===========================================
log_info "Restarting application..."
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

# ===========================================
# 6. Save PM2 Process List
# ===========================================
pm2 save

# ===========================================
# 7. Health Check
# ===========================================
log_info "Running health check..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HTTP_CODE" == "200" ]; then
    log_info "Health check passed! (HTTP $HTTP_CODE)"
else
    log_error "Health check failed! (HTTP $HTTP_CODE)"
    log_warn "Rolling back..."
    pm2 reload ecosystem.config.js --env production
    exit 1
fi

# ===========================================
# 8. Cleanup Old Backups (keep last 5)
# ===========================================
log_info "Cleaning up old backups..."
ls -t $BACKUP_DIR/backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm

echo ""
echo "============================================="
echo " Deployment Complete!"
echo "============================================="
echo ""
log_info "Application is running at https://yourdomain.com"
echo ""
pm2 status
