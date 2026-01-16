#!/bin/bash
# Deploy Marketing Automation Agents to VPS
# Run this script on your VPS: ssh root@72.61.16.111

set -e  # Exit on error

echo "======================================"
echo "Marketing Agents Deployment"
echo "======================================"

echo ""
echo "[1/6] Pulling latest code..."
cd /root/agentsflowai.cloud
git pull origin main

echo ""
echo "[2/6] Generating Prisma client..."
npx prisma generate

echo ""
echo "[3/6] Running database migrations..."
npx prisma migrate deploy

echo ""
echo "[4/6] Rebuilding Docker container..."
docker-compose up -d --build app

echo ""
echo "[5/6] Waiting for container to start..."
sleep 10

echo ""
echo "[6/6] Checking deployment status..."
docker ps --filter name=agentsflowai-app --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "======================================"
echo "Checking application logs..."
echo "======================================"
docker logs agentsflowai-app --tail 40

echo ""
echo "======================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "Test the marketing API:"
echo "  curl http://72.61.16.111:3001/api/marketing/campaigns"
echo ""
echo "Next steps:"
echo "  1. Create a campaign via POST /api/marketing/campaigns"
echo "  2. Run research: POST /api/marketing/campaigns/{id}/run"
echo "  3. Run content: POST /api/marketing/campaigns/{id}/run (again)"
echo "  4. Review output: GET /api/marketing/campaigns/{id}"
echo ""
