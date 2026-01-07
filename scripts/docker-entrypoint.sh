#!/bin/sh
set -e

echo "==================================="
echo "AgentsFlowAI Production Startup"
echo "==================================="

# Function to handle graceful shutdown
cleanup() {
    echo ""
    echo "Received shutdown signal, gracefully stopping..."
    echo "Waiting for in-flight AI requests to complete (max 30s)..."
    
    # Send SIGTERM to Node.js process
    if [ -n "$NODE_PID" ]; then
        kill -TERM "$NODE_PID" 2>/dev/null || true
        
        # Wait for process to exit (max 30s)
        for i in $(seq 1 30); do
            if ! kill -0 "$NODE_PID" 2>/dev/null; then
                echo "Application stopped gracefully"
                exit 0
            fi
            sleep 1
        done
        
        # Force kill if still running
        echo "Forcing shutdown after 30s timeout"
        kill -KILL "$NODE_PID" 2>/dev/null || true
    fi
    
    exit 0
}

# Register signal handlers
trap cleanup SIGTERM SIGINT

# Wait for dependencies
echo "Checking dependencies..."

# Wait for Ollama
echo "Waiting for Ollama service..."
until curl -f http://ollama:11434/api/tags > /dev/null 2>&1; do
    echo "  Ollama not ready, waiting..."
    sleep 2
done
echo "✓ Ollama is ready"

# Wait for Redis
if [ -n "$REDIS_URL" ]; then
    echo "Waiting for Redis service..."
    until nc -z redis 6379 > /dev/null 2>&1; do
        echo "  Redis not ready, waiting..."
        sleep 2
    done
    echo "✓ Redis is ready"
fi

# Wait for database (Neon PostgreSQL - external host)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database service..."
    # Extract host from DATABASE_URL (format: postgres://user:pass@host:5432/db)
    DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
    DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
    
    until nc -z "$DB_HOST" "${DB_PORT:-5432}" > /dev/null 2>&1; do
        echo "  Database not ready at $DB_HOST:${DB_PORT:-5432}, waiting..."
        sleep 2
    done
    echo "✓ Database is ready"
else
    echo "WARNING: DATABASE_URL not set, skipping database health check"
fi

# Warm up Ollama models if enabled
if [ "$OLLAMA_WARMUP_ON_STARTUP" = "true" ]; then
    echo ""
    echo "==================================="
    echo "Warming up Ollama models..."
    echo "==================================="
    
    # Run warmup script
    node -e "
        const axios = require('axios');
        const models = ['mistral:7b', 'gemma2:9b', 'codellama:7b'];
        
        async function warmup() {
            for (const model of models) {
                try {
                    console.log('Warming up ' + model + '...');
                    await axios.post('http://ollama:11434/api/generate', {
                        model: model,
                        prompt: 'test',
                        stream: false
                    }, { timeout: 120000 });
                    console.log('✓ ' + model + ' ready');
                } catch (error) {
                    console.log('✗ ' + model + ' failed: ' + error.message);
                }
            }
        }
        
        warmup().then(() => {
            console.log('Model warmup completed');
        }).catch(err => {
            console.error('Warmup error:', err.message);
        });
    "
    
    echo "==================================="
fi

echo ""
echo "Starting Next.js application..."
echo "==================================="

# Start Next.js server in background
node server.js &
NODE_PID=$!

# Wait for Node.js process
wait $NODE_PID
