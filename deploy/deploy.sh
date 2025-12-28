#!/bin/bash
# Deploy script for agentsflow-ai.cloud
# Usage: ./deploy.sh

set -e

# Configuration
SERVER="root@srv1187860.hstgr.cloud"
REMOTE_DIR="/var/www/agentsflow-ai"
LOCAL_DIR="$(pwd)/"
SSH_KEY="~/.ssh/deploy_key"

echo "🚀 Starting deployment to $SERVER..."

# 1. Build the project locally
echo "📦 Building project locally..."
cd "$LOCAL_DIR"
npm run build

# 2. Sync files to server
echo "📤 Syncing files to server..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.log' \
  --exclude='.env*' \
  "$LOCAL_DIR" "$SERVER:$REMOTE_DIR"

# 3. Install dependencies and start on server
echo "🔧 Installing dependencies and starting app..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'REMOTE_EOF'
cd /var/www/agentsflow-ai

# Install dependencies
echo "Installing npm packages..."
npm ci --production=false

# Build application
echo "Building application..."
npm run build

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || echo "No migrations needed"

# Seed database
echo "Seeding database..."
npx prisma db seed 2>/dev/null || echo "Seed skipped"

# Restart PM2
echo "Restarting PM2..."
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Show status
pm2 status
REMOTE_EOF

echo "✅ Deployment complete!"
echo "App should be running at: http://72.61.16.111:3005"
