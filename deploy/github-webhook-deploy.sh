#!/bin/bash
# ===========================================
# GitHub Webhook Receiver Script
# ===========================================
# This script is called by the GitHub webhook
# It pulls the latest code and redeploys
# ===========================================

set -e

# Configuration
APP_DIR="/var/www/agentsflow-ai"
WEBHOOK_SECRET="${GITHUB_WEBHOOK_SECRET:-your-secret-here}"
LOG_FILE="/var/log/agentsflow-deploy.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() { log "${GREEN}[INFO]${NC} $1"; }
log_warn() { log "${YELLOW}[WARN]${NC} $1"; }
log_error() { log "${RED}[ERROR]${NC} $1"; }

# Verify webhook signature
verify_signature() {
    local signature="$1"
    local payload="$2"
    local computed_signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)
    
    if [ "$signature" != "sha256=$computed_signature" ]; then
        log_error "Invalid webhook signature"
        exit 1
    fi
    log_info "Webhook signature verified"
}

# Main deployment function
deploy() {
    log "============================================="
    log " Starting automatic deployment"
    log "============================================="
    
    cd "$APP_DIR"
    
    # Pull latest code
    log_info "Pulling latest code..."
    git fetch origin main
    git checkout main
    git pull origin main
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --production=false 2>&1 | tee -a "$LOG_FILE"
    
    # Build application
    log_info "Building application..."
    npm run build 2>&1 | tee -a "$LOG_FILE"
    
    # Restart PM2
    log_info "Restarting PM2..."
    pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    pm2 save
    
    # Health check
    sleep 10
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/health)
    
    if [ "$HTTP_CODE" == "200" ]; then
        log_info "Deployment successful! (HTTP $HTTP_CODE)"
    else
        log_error "Health check failed! (HTTP $HTTP_CODE)"
    fi
    
    log "============================================="
    log " Deployment complete"
    log "============================================="
}

# Main execution
if [ "$1" == "--verify" ]; then
    # Verify mode - just check signature
    verify_signature "$2" "$3"
else
    # Deploy mode
    deploy
fi
