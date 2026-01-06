# Docker Setup Guide for AgentsFlowAI

This guide provides comprehensive instructions for setting up and deploying AgentsFlowAI using Docker containers.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Performance Tuning](#performance-tuning)
- [Backup and Recovery](#backup-and-recovery)

## Overview

AgentsFlowAI uses Docker for containerized deployment, providing:

- **Isolation**: Each service runs in its own container
- **Consistency**: Same environment across development and production
- **Scalability**: Easy resource management and scaling
- **Security**: Enhanced security with container restrictions
- **Portability**: Run anywhere Docker is supported

### Services

- **app**: Next.js application server
- **ollama**: Local AI model server
- **nginx**: Reverse proxy and SSL termination (external)
- **postgres**: PostgreSQL database (optional, can be external)

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 22.04+ recommended)
- **CPU**: 2+ cores (4+ recommended for AI workloads)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 25GB+ available space
- **Network**: Stable internet connection

### Software Requirements

- **Docker**: 24.0+ with Docker Compose plugin
- **Git**: For cloning the repository
- **SSH**: For secure server access

### Server Setup

Run the automated setup script:

```bash
# As root user
git clone https://github.com/your-repo/agentsflow-ai.git /tmp/setup
cd /tmp/setup
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh
```

This script installs:
- Docker and Docker Compose
- Nginx web server
- SSL certificates (Let's Encrypt)
- Firewall (UFW)
- Security hardening
- Fail2ban protection

## Quick Start

### Development

```bash
# Clone repository
git clone https://github.com/your-repo/agentsflow-ai.git
cd agentsflow-ai

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f
```

### Production

```bash
# On production server
cd /home/deploy/agentsflow-ai

# Configure environment
cp .env.production.template .env
nano .env  # Add production values

# Deploy
./deploy/docker-deploy.sh

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## Architecture

### Container Layout

```
agentsflowai-network (Docker network)
├── app (Next.js app on port 3000)
│   ├── Next.js application
│   ├── Prisma client
│   └── Static assets
├── ollama (AI models on port 11434)
│   ├── mistral:7b
│   ├── llama3.1:8b
│   └── gemma2:9b
└── postgres (optional, external DB)
    └── PostgreSQL database
```

### Data Flow

1. **Client Request** → Nginx (port 80/443)
2. **SSL Termination** → Nginx handles HTTPS
3. **Reverse Proxy** → Routes to app container (port 3000)
4. **Application** → Next.js handles request
5. **Database** → Prisma connects to PostgreSQL
6. **AI Processing** → App communicates with Ollama (port 11434)

### Volumes and Persistence

- **ollama-models**: Stores downloaded AI models (persistent)
- **uploads**: User uploaded files (persistent)
- **postgres-data**: Database files (if using Docker PostgreSQL)

### Networking

- **Internal Network**: `agentsflowai-network` for service communication
- **External Access**: Only app (port 3000) and ollama (port 11434) exposed
- **Nginx Proxy**: Handles external traffic and SSL termination

## Configuration

### Environment Variables

Create `.env` file with required variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
PORT=3000

# AI Providers
OPENAI_API_KEY=sk-your-key
OLLAMA_BASE_URL=http://ollama:11434

# Security
SESSION_SECRET=your-session-secret
BETTER_AUTH_SECRET=your-auth-secret

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Docker Compose Configuration

#### Development (`docker-compose.yml` + `docker-compose.dev.yml`)

```yaml
# Base configuration
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src  # Hot reload
    environment:
      - NODE_ENV=development

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
```

#### Production (`docker-compose.prod.yml`)

```yaml
# Production configuration
services:
  app:
    image: agentsflowai:latest
    ports:
      - "3000:3000"
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
    security_opt:
      - no-new-privileges: true
```

### Nginx Configuration

Update `/etc/nginx/sites-available/agentsflow-ai`:

```nginx
upstream nextjs_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Proxy to Docker container
    location / {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Deployment

### Automated Deployment

```bash
# From local machine
./deploy/docker-deploy.sh
```

This script:
1. Builds Docker image locally
2. Transfers image to server
3. Runs database migrations
4. Starts containers with production config
5. Verifies health checks

### Manual Deployment

```bash
# Build and deploy manually
docker build -t agentsflowai:latest .
docker save agentsflowai:latest | ssh user@server docker load

# On server
cd /home/deploy/agentsflow-ai
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Blue-Green Deployment

For zero-downtime updates:

```bash
# Start new version alongside old
docker-compose -f docker-compose.prod.yml up -d --scale app=2

# Test new version
curl http://localhost:3001/api/health  # New instance

# Switch traffic (update Nginx upstream)
# Gradually reduce old instances
docker-compose -f docker-compose.prod.yml up -d --scale app=1
```

## Monitoring

### Container Monitoring

```bash
# Real-time resource usage
docker stats

# Container logs
docker-compose -f docker-compose.prod.yml logs -f app

# Health status
docker-compose -f docker-compose.prod.yml ps
curl https://yourdomain.com/api/health
```

### Health Checks

The application includes health checks for:

- **Database connectivity**
- **Memory usage**
- **AI service availability**
- **Container health**

Health endpoint response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-06T17:00:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "latency": 5 },
    "ollama": { "status": "up", "models": ["mistral:7b"] },
    "memory": { "status": "ok", "used": 256, "total": 1024 }
  }
}
```

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs app

# View Ollama logs
docker-compose -f docker-compose.prod.yml logs ollama

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Log rotation (configured in docker-compose.prod.yml)
# max-size: 10m, max-file: 3
```

### Metrics and Alerting

Integrate with monitoring tools:

- **Prometheus**: Container metrics
- **Grafana**: Dashboards
- **ELK Stack**: Log aggregation
- **Uptime Kuma**: Health monitoring

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Symptoms:**
- `docker-compose ps` shows container as exited
- Health checks failing

**Solutions:**
```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs app

# Check for configuration errors
docker-compose -f docker-compose.prod.yml config

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec app env | grep DATABASE_URL

# Test database connection
docker-compose -f docker-compose.prod.yml exec app npx prisma db push --preview-feature
```

#### 2. Database Connection Issues

**Symptoms:**
- Application logs show connection errors
- Health check shows database down

**Solutions:**
```bash
# Test external database connectivity
psql "postgresql://user:pass@host:5432/db" -c "SELECT 1"

# Check DATABASE_URL format
echo $DATABASE_URL

# Verify SSL settings for external DB
# Add ?sslmode=require for cloud databases
```

#### 3. AI Service Unavailable

**Symptoms:**
- Chat features not working
- Ollama container unhealthy

**Solutions:**
```bash
# Check Ollama status
docker-compose -f docker-compose.prod.yml exec ollama curl http://localhost:11434/api/tags

# Pull required models
docker-compose -f docker-compose.prod.yml exec ollama ollama pull mistral:7b

# Check Ollama logs
docker-compose -f docker-compose.prod.yml logs ollama

# Restart Ollama service
docker-compose -f docker-compose.prod.yml restart ollama
```

#### 4. Memory Issues

**Symptoms:**
- Container killed due to OOM
- Application slow or unresponsive

**Solutions:**
```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 1G

# Monitor memory-intensive operations
# Check for memory leaks in application code
```

#### 5. Permission Issues

**Symptoms:**
- Container fails to start with permission errors
- File access issues

**Solutions:**
```bash
# Ensure deploy user is in docker group
sudo usermod -aG docker deploy

# Check file permissions
ls -la /home/deploy/agentsflow-ai/.env

# Fix permissions if needed
chown deploy:deploy /home/deploy/agentsflow-ai/.env
chmod 600 /home/deploy/agentsflow-ai/.env
```

#### 6. Port Conflicts

**Symptoms:**
- Container fails to start with port binding errors

**Solutions:**
```bash
# Check what's using the ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :11434

# Stop conflicting services
sudo systemctl stop nginx  # If using port 80/443

# Change container ports in docker-compose.prod.yml
ports:
  - "3001:3000"  # Change host port
```

### Debug Commands

```bash
# Enter container shell
docker-compose -f docker-compose.prod.yml exec app sh

# Run database migrations manually
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Test AI connectivity
docker-compose -f docker-compose.prod.yml exec app curl http://ollama:11434/api/tags

# Check application health
docker-compose -f docker-compose.prod.yml exec app node -e "require('http').get('http://localhost:3000/api/health', r => console.log(r.statusCode))"

# View environment variables
docker-compose -f docker-compose.prod.yml exec app env
```

## Security

### Container Security

- **Non-root user**: Application runs as `nextjs` user (uid 1001)
- **Read-only filesystem**: Container filesystem mostly read-only
- **No new privileges**: `no-new-privileges: true` security option
- **Capability restrictions**: Limited Linux capabilities
- **Security updates**: Regular base image updates

### Network Security

- **Internal networking**: Services communicate via private networks
- **Firewall**: UFW configured to allow only necessary ports
- **SSL/TLS**: All external traffic encrypted with Let's Encrypt
- **Rate limiting**: Nginx rate limits on API endpoints

### Secret Management

- **Environment variables**: Sensitive data passed via env vars
- **No secrets in images**: Environment variables set at runtime
- **File permissions**: `.env` files with restrictive permissions (600)

### Security Best Practices

```yaml
# Security options in docker-compose.prod.yml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    user: "1001:1001"  # Non-root user
```

## Performance Tuning

### Resource Allocation

```yaml
# Adjust based on server capacity
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'    # Match server cores
          memory: 2G     # Increase for high traffic
        reservations:
          cpus: '1.0'    # Guaranteed CPU
          memory: 1G     # Guaranteed RAM

  ollama:
    deploy:
      resources:
        limits:
          cpus: '4.0'    # AI processing intensive
          memory: 8G     # Model memory requirements
```

### Database Optimization

- **Connection pooling**: Use PgBouncer for high traffic
- **Query optimization**: Monitor slow queries
- **Indexing**: Ensure proper database indexes
- **Caching**: Implement Redis for session/cache storage

### Application Performance

- **Health checks**: Proper health check intervals
- **Graceful shutdown**: Allow time for connections to close
- **Memory management**: Monitor for memory leaks
- **CPU optimization**: Profile CPU-intensive operations

### Monitoring Performance

```bash
# Monitor container performance
docker stats --no-stream

# Application performance
curl https://yourdomain.com/api/health

# Database performance
docker-compose -f docker-compose.prod.yml exec app npx prisma studio --port 5555
```

## Backup and Recovery

### Data Backup

```bash
# Database backup (external DB)
pg_dump "postgresql://user:pass@host:5432/db" > backup.sql

# Volume backup
docker run --rm -v agentsflowai_ollama-models:/data -v $(pwd):/backup alpine tar czf /backup/ollama-models.tar.gz -C /data .

# Application backup
tar -czf backup.tar.gz --exclude=node_modules --exclude=.next .
```

### Container Backup

```bash
# Save container images
docker save agentsflowai:latest > app-image.tar
docker save ollama/ollama:latest > ollama-image.tar

# Backup volumes
docker run --rm -v agentsflowai_ollama-models:/source -v $(pwd):/dest alpine cp -r /source /dest/ollama-models
```

### Recovery Procedures

```bash
# Restore from backup
docker load < app-image.tar
docker-compose -f docker-compose.prod.yml up -d

# Restore database
psql "postgresql://user:pass@host:5432/db" < backup.sql

# Restore volumes
docker run --rm -v agentsflowai_ollama-models:/dest -v $(pwd):/source alpine cp -r /source/ollama-models /dest/
```

### Disaster Recovery

1. **Stop affected services**
2. **Restore from backups**
3. **Verify data integrity**
4. **Restart services**
5. **Test functionality**
6. **Update monitoring alerts**

## Advanced Topics

### Scaling

```bash
# Scale application instances
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Load balancing with Nginx
upstream nextjs_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### High Availability

- **Load balancer**: Nginx or external load balancer
- **Database clustering**: PostgreSQL with replication
- **Session storage**: Redis for session persistence
- **Monitoring**: Comprehensive monitoring and alerting

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Deploy to production
  run: |
    docker build -t agentsflowai:${{ github.sha }} .
    docker tag agentsflowai:${{ github.sha }} agentsflowai:latest
    ./deploy/docker-deploy.sh
```

### Orchestration

For production at scale, consider:
- **Docker Swarm**: Multi-node orchestration
- **Kubernetes**: Container orchestration platform
- **AWS ECS/Fargate**: Managed container service
- **Google Cloud Run**: Serverless containers

## Support

### Documentation

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Ollama Docker](https://github.com/jmorganca/ollama#docker)

### Community Resources

- [Docker Forums](https://forums.docker.com/)
- [Next.js Community](https://nextjs.org/community)
- [Prisma Community](https://www.prisma.io/community)

### Getting Help

1. Check application logs: `docker-compose logs app`
2. Verify configuration: `docker-compose config`
3. Test health endpoints: `curl https://yourdomain.com/api/health`
4. Review this documentation
5. Check GitHub issues for similar problems
6. Contact support with detailed logs and error messages