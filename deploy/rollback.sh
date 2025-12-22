#!/bin/bash
# ===========================================
# AgentsFlowAI - Rollback Script
# ===========================================
# Rollback to a previous deployment
# Usage: ./rollback.sh [backup-file]
# ===========================================

set -e

APP_DIR="/var/www/agentsflow-ai"
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
echo " AgentsFlowAI Rollback"
echo "============================================="

cd $APP_DIR

# List available backups
if [ -z "$1" ]; then
    echo ""
    echo "Available backups:"
    echo ""
    ls -lh $BACKUP_DIR/*.tar.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: ./rollback.sh <backup-file>"
    echo "Example: ./rollback.sh backup-20241221-120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_info "Rolling back to: $1"

# Extract backup
log_info "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C $APP_DIR

# Restart PM2
log_info "Restarting application..."
pm2 reload ecosystem.config.js --env production

# Health check
log_info "Running health check..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HTTP_CODE" == "200" ]; then
    log_info "Rollback successful! (HTTP $HTTP_CODE)"
else
    log_error "Rollback may have issues (HTTP $HTTP_CODE)"
    log_warn "Check logs: pm2 logs"
fi

echo ""
pm2 status
