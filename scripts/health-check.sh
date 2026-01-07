#!/bin/bash

echo "==================================="
echo "AgentsFlowAI Health Check"
echo "==================================="

# Check Nginx
echo -n "Nginx: "
if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    echo "✓ Healthy"
else
    echo "✗ Unhealthy"
fi

# Check App (direct)
echo -n "App: "
if docker exec agentsflowai-app-prod node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode===200?0:1))" 2>/dev/null; then
    echo "✓ Healthy"
else
    echo "✗ Unhealthy"
fi

# Check Ollama
echo -n "Ollama: "
if curl -f -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Healthy"
else
    echo "✗ Unhealthy"
fi

# Check Redis
echo -n "Redis: "
if docker exec agentsflowai-redis-prod redis-cli ping > /dev/null 2>&1; then
    echo "✓ Healthy"
else
    echo "✗ Unhealthy"
fi

echo "==================================="
