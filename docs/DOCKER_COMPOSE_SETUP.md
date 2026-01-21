# Docker Compose Setup Guide

Complete guide for deploying AgentsFlowAI using Docker Compose for both development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Service Architecture](#service-architecture)
- [Environment Variables](#environment-variables)
- [Volume Management](#volume-management)
- [Troubleshooting](#troubleshooting)
- [Useful Commands](#useful-commands)

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker Desktop** or **Docker Engine + Docker Compose**
  - Docker Desktop (recommended for Mac/Windows): https://www.docker.com/products/docker-desktop
  - Docker Engine + Docker Compose (Linux): https://docs.docker.com/engine/install/
- **At least 16GB RAM** (for running Ollama models efficiently)
- **20GB free disk space** (for Docker images and Ollama models)
- **Node.js 20.x** (for running npm scripts)

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and add your required values:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
SESSION_SECRET=J9WalKa/kK5JR/ZaAmVjOT9VZeuBMsxLTQwaTy66zOA=
BETTER_AUTH_SECRET=K02Ve5mw7WCb6wQ6EdFBsfvb6pmvXhSTHD5G+t4kR3c=

# Optional AI providers (at least one recommended)
OPENAI_API_KEY=your-openai-api-key-here
OPENROUTER_API_KEY=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
# Note: OpenRouter provides access to cost-effective Chinese models like DeepSeek and GLM-4.5-Air


```

### 2. Build Docker Images

Build the Docker images for the application:

```bash
npm run docker:build
```

Or manually:

```bash
docker-compose build
```

### 3. Start Services

Start all services in production-like mode:

```bash
npm run docker:up
```

Or manually:

```bash
docker-compose up -d
```

This will start:
- **Next.js application** on port 3000
- **Ollama service** on port 11434

### 4. Pull Ollama Models

After containers are running, pull the required Ollama models:

```bash
npm run docker:ollama:pull
```

This command will pull:
- `mistral:7b` (~4GB)
- `llama3.1:8b` (~4.7GB)
- `gemma2:9b` (~5.4GB)

**Note:** This may take 10-30 minutes depending on your internet connection.

### 5. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

### 6. Check Health Status

Verify all services are running correctly:

```bash
curl http://localhost:3000/api/health
```

Or check AI provider health:

```bash
curl http://localhost:3000/api/ai/health-check
```

## Development Workflow

For local development with hot-reload and debugging capabilities:

### Start Development Environment

```bash
npm run docker:dev
```

This will:
- Use the `builder` stage from Dockerfile (includes dev dependencies)
- Run `npm run dev` for hot-reload
- Mount source code directories for live editing
- Enable Node.js debugging on port 9229
- Set environment to development mode

### Development Features

- **Hot-reload**: Changes to source files are automatically detected
- **Source maps**: Full debugging support with source maps
- **Debugging**: Node.js debugger available on port 9229
- **Live editing**: Edit code locally, see changes immediately
- **Isolated dependencies**: Container node_modules won't conflict with host

### View Logs

Watch real-time logs from all services:

```bash
npm run docker:logs
```

Or view logs for a specific service:

```bash
docker-compose logs -f app
docker-compose logs -f ollama
```

### Stop Development Environment

```bash
npm run docker:dev:down
```

Or stop without removing volumes:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml stop
```

## Service Architecture

```mermaid
graph TD
    A[Browser] -->|Port 3000| B[Next.js App Container]
    B -->|Internal Network| C[Ollama Container]
    B -->|External| D[Neon PostgreSQL]
    B -->|External| E[AI Providers<br/>OpenAI, Anthropic, Google]
    C -->|Port 11434| F[Ollama Models<br/>Volume]
    
    style B fill:#4A90E2
    style C fill:#50C878
    style D fill:#FF6B6B
    style E fill:#FFD93D
    style F fill:#95E1D3
```

### Service Details

#### Next.js App Container (`app`)
- **Container Name**: `agentsflowai-app`
- **Port**: 3000
- **Network**: `agentsflowai-network` (internal)
- **Dependencies**: Ollama service
- **Environment**: Configured via `.env` file
- **Health Check**: HTTP check on `/api/health` every 30s

#### Ollama Container (`ollama`)
- **Container Name**: `agentsflowai-ollama`
- **Port**: 11434
- **Network**: `agentsflowai-network` (internal)
- **Volume**: `ollama-models` for persistent model storage
- **Health Check**: HTTP check on `/api/tags` every 30s
- **Purpose**: Local AI model inference

#### Custom Network
- **Name**: `agentsflowai-network`
- **Driver**: Bridge
- **Purpose**: Enables service-to-service communication
- **DNS**: Automatic service name resolution (e.g., `http://ollama:11434`)

## Environment Variables

### Required Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | - | Session encryption key (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_SECRET` | Yes | - | Auth encryption key (generate with `openssl rand -base64 32`) |

### AI Provider Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OLLAMA_BASE_URL` | No | `http://ollama:11434` | Ollama service URL (auto-configured in Docker Compose) |
| `OPENAI_API_KEY` | No | - | OpenAI API key for GPT models |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key for Claude models |
| `OPENROUTER_API_KEY` | No | - | OpenRouter API key for multi-provider access (includes Chinese models like DeepSeek and GLM-4.5-Air) |

### Application Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `production` | Node environment (`development` or `production`) |
| `PORT` | No | `3000` | Application port |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL of the application |

### Docker Compose Overrides

In Docker Compose, the following environment variables are automatically set:

- `OLLAMA_BASE_URL=http://ollama:11434` (uses internal Docker network)

In development mode, additional variables are set:

- `NODE_ENV=development`
- `NEXT_TELEMETRY_DISABLED=1`
- `WATCHPACK_POLLING=true` (enables file watching in Docker)

## Volume Management

### Ollama Models Volume

The `ollama-models` volume persists downloaded AI models across container restarts.

**Volume Details:**
- **Name**: `ollama-models`
- **Mount Point**: `/root/.ollama`
- **Purpose**: Persist downloaded AI models (4-6GB per model)
- **Total Size**: ~15-20GB for all recommended models

**Backup Ollama Models:**

```bash
docker run --rm \
  -v ollama-models:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ollama-models.tar.gz -C /data .
```

**Restore Ollama Models:**

```bash
docker run --rm \
  -v ollama-models:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/ollama-models.tar.gz -C /data
```

**Clean Ollama Models:**

```bash
docker volume rm agentsflowai_ollama-models
```

### Development Node Modules Volume

The `dev-node-modules` volume prevents host `node_modules` from overwriting container dependencies in development mode.

**Volume Details:**
- **Name**: `dev-node-modules`
- **Mount Point**: `/app/node_modules`
- **Purpose**: Isolate container dependencies from host
- **Used In**: Development mode only

**Clean Development Dependencies:**

```bash
docker volume rm agentsflowai_dev-node-modules
```

## Troubleshooting

### Ollama Models Not Found

**Problem:** AI requests to Ollama fail with "model not found" errors.

**Solution:**
```bash
# Pull required models
npm run docker:ollama:pull

# Or pull models individually
docker-compose exec ollama ollama pull mistral:7b
docker-compose exec ollama ollama pull llama3.1:8b
docker-compose exec ollama ollama pull gemma2:9b

# Check installed models
docker-compose exec ollama ollama list
```

### Port Conflicts

**Problem:** Error: "port is already allocated" when starting services.

**Solution:**

1. Check which process is using the port:
```bash
# macOS/Linux
lsof -i :3000
lsof -i :11434

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :11434
```

2. Stop the conflicting process or change port mappings in `docker-compose.yml`:
```yaml
services:
  app:
    ports:
      - "3001:3000"  # Changed from 3000:3000
  ollama:
    ports:
      - "11435:11434"  # Changed from 11434:11434
```

### Permission Errors

**Problem:** Permission denied when accessing project files.

**Solution:**

Ensure Docker has permission to access the project directory:

- **macOS**: Go to Docker Desktop → Preferences → Resources → File Sharing
- **Linux**: Ensure your user is in the `docker` group:
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker
  ```

### Out of Memory

**Problem:** Ollama containers crash or models fail to load.

**Solution:**

Increase Docker Desktop memory allocation:

1. Open Docker Desktop
2. Go to Preferences → Resources
3. Increase Memory to at least 16GB
4. Apply & Restart

For Docker Engine (Linux), ensure system has sufficient RAM.

### Hot-Reload Not Working

**Problem:** Changes to source files are not reflected in the running container.

**Solution:**

1. Ensure `WATCHPACK_POLLING=true` is set in development environment
2. Verify bind mounts are working:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec app ls -la /app/src
```
3. Restart the development environment:
```bash
npm run docker:dev:down
npm run docker:dev
```

### Database Connection Errors

**Problem:** Application can't connect to the database.

**Solution:**

1. Verify `DATABASE_URL` is correctly set in `.env`
2. Ensure the database is accessible from Docker containers
3. For cloud databases (like Neon), check firewall/security settings
4. Test database connection:
```bash
docker-compose exec app npx prisma db pull
```

### Ollama Service Unhealthy

**Problem:** Ollama health check fails.

**Solution:**

1. Check Ollama logs:
```bash
docker-compose logs ollama
```

2. Verify Ollama is responding:
```bash
docker-compose exec ollama curl http://localhost:11434/api/tags
```

3. Restart Ollama service:
```bash
docker-compose restart ollama
```

## Useful Commands

### Container Management

```bash
# Start services (detached mode)
docker-compose up -d

# Start services (attached mode with logs)
docker-compose up

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v

# Restart a specific service
docker-compose restart app
docker-compose restart ollama

# View container status
docker-compose ps
```

### Logs and Debugging

```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f app
docker-compose logs -f ollama

# View last 100 lines of logs
docker-compose logs --tail=100 app

# Open shell in container
docker-compose exec app sh
docker-compose exec ollama sh

# Run command in container
docker-compose exec app npm run typecheck
docker-compose exec app npx prisma studio
```

### Ollama Management

```bash
# List installed models
docker-compose exec ollama ollama list

# Pull a specific model
docker-compose exec ollama ollama pull mistral:7b

# Remove a model
docker-compose exec ollama ollama rm mistral:7b

# Show model information
docker-compose exec ollama ollama show mistral:7b

# Test model inference
docker-compose exec ollama ollama run mistral:7b "Hello, world!"
```

### Build and Cleanup

```bash
# Rebuild images (no cache)
docker-compose build --no-cache

# Remove unused images
docker image prune -a

# Remove all containers, networks, volumes
docker-compose down -v
docker system prune -a --volumes

# Check disk usage
docker system df
```

### Database Operations

```bash
# Run Prisma migrations
docker-compose exec app npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec app npx prisma studio

# Seed database
docker-compose exec app npm run db:seed

# Reset database
docker-compose exec app npx prisma migrate reset
```

### Health Checks

```bash
# Check application health
curl http://localhost:3000/api/health

# Check AI provider health
curl http://localhost:3000/api/ai/health-check

# Check Ollama health
curl http://localhost:11434/api/tags

# Check container health status
docker-compose ps
```

### NPM Script Shortcuts

```bash
# Build images
npm run docker:build

# Start production mode
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Start development mode
npm run docker:dev

# Build for development
npm run docker:dev:build

# Stop development mode
npm run docker:dev:down

# Clean everything (including volumes)
npm run docker:clean

# Pull Ollama models
npm run docker:ollama:pull
```

## Best Practices

### Security

1. **Never commit `.env` files** to version control
2. **Use Docker secrets** for sensitive data in production
3. **Regularly update** base images and dependencies
4. **Limit container resources** to prevent resource exhaustion
5. **Use read-only** file systems where possible

### Performance

1. **Use BuildKit** for faster builds: `DOCKER_BUILDKIT=1 docker-compose build`
2. **Enable layer caching** by ordering Dockerfile commands properly
3. **Use multi-stage builds** to minimize image size
4. **Prune unused images** regularly with `docker system prune`

### Development

1. **Use bind mounts** for source code in development
2. **Use named volumes** for node_modules to avoid conflicts
3. **Enable hot-reload** with `WATCHPACK_POLLING=true`
4. **Keep development and production** configs separate

### Monitoring

1. **Check health endpoints** regularly
2. **Monitor container resources** with `docker stats`
3. **Review logs** for errors and warnings
4. **Set up alerts** for container failures

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Ollama Documentation](https://ollama.com/docs)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-lambda)

## Support

If you encounter issues not covered in this guide:

1. Check the [main README](../README.md) for general setup instructions
2. Review [Ollama Setup Guide](./OLLAMA_SETUP.md) for Ollama-specific issues
3. Open an issue on GitHub with detailed logs and environment information
