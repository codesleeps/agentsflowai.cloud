# Docker Migration Guide: From PM2 to Docker

This guide provides step-by-step instructions for migrating AgentsFlowAI from PM2-based deployment to Docker containers.

## Overview

### Why Migrate to Docker?

- **Isolation**: Each service runs in its own container with isolated dependencies
- **Consistency**: Same environment across development, staging, and production
- **Scalability**: Easy horizontal scaling with container orchestration
- **Resource Management**: Better control over CPU, memory, and storage limits
- **Security**: Reduced attack surface with container security features
- **Portability**: Run anywhere Docker is supported

### Current PM2 Setup vs Docker Setup

| Aspect | PM2 | Docker |
|--------|-----|--------|
| **Process Management** | PM2 cluster mode | Docker containers with restart policies |
| **Dependencies** | System-level Node.js, PM2 | Containerized Node.js and Ollama |
| **Scaling** | PM2 cluster scaling | Docker Compose scaling |
| **Resource Limits** | PM2 max_memory_restart | Docker resource constraints |
| **Isolation** | Process-level | Container-level |
| **Deployment** | File sync + npm install | Image build + container run |

## Prerequisites

Before migrating, ensure:

1. **Docker and Docker Compose installed** on your server
2. **Server setup completed** with `deploy/setup-server.sh`
3. **Environment variables** configured in `.env` file
4. **Database accessible** from Docker containers
5. **SSL certificates** configured for your domain

## Migration Steps

### Step 1: Backup Current Deployment

```bash
# Create backup of current PM2 deployment
cd /home/deploy/agentsflow-ai
mkdir -p backups
tar -czf backups/pm2-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.env* \
  .
```

### Step 2: Stop PM2 Services

```bash
# Stop current PM2 processes
pm2 stop all
pm2 delete all
pm2 save

# Optional: Remove PM2 startup
pm2 unstartup systemd
```

### Step 3: Prepare Docker Environment

```bash
# Ensure Docker is running
sudo systemctl status docker

# Ensure deploy user is in docker group
sudo usermod -aG docker deploy

# Logout and login again for group changes to take effect
# Or run: newgrp docker
```

### Step 4: Configure Environment Variables

```bash
# Copy production environment template
cp .env.production.template .env

# Edit with your production values
nano .env
```

Required environment variables for Docker:
```env
# Database (ensure accessible from containers)
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
```

### Step 5: Build and Test Locally (Optional)

```bash
# Build Docker image locally
docker build -t agentsflowai:latest .

# Test with docker-compose.dev.yml (if available)
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f
```

### Step 6: Deploy with Docker

```bash
# Run the Docker deployment script
./deploy/docker-deploy.sh
```

Or manually:
```bash
# Build image locally and deploy
docker build -t agentsflowai:latest .
docker save agentsflowai:latest | ssh deploy@your-server docker load

# On server
cd /home/deploy/agentsflow-ai
docker-compose -f docker-compose.prod.yml up -d
```

### Step 7: Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl https://yourdomain.com/api/health

# Test application functionality
curl https://yourdomain.com
```

### Step 8: Update Nginx Configuration (if needed)

The existing Nginx configuration should work with Docker, but verify the upstream points to the correct port:

```nginx
upstream nextjs_upstream {
    server 127.0.0.1:3000;  # Docker container port
    keepalive 64;
}
```

### Step 9: Update Monitoring and Maintenance Scripts

```bash
# Update monitor.sh to check Docker containers instead of PM2
# Update any automation scripts to use Docker commands
```

## Rollback Plan

If issues occur with Docker deployment:

### Quick Rollback to PM2

```bash
# Stop Docker containers
docker-compose -f docker-compose.prod.yml down

# Restore from backup
cd /home/deploy/agentsflow-ai
tar -xzf backups/pm2-backup-*.tar.gz

# Reinstall dependencies
npm ci

# Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### Gradual Rollback

1. Keep both deployments ready
2. Switch Nginx upstream between PM2 (port 3006) and Docker (port 3000)
3. Test thoroughly before full switch
4. Monitor for 24-48 hours before removing old deployment

## Configuration Differences

### PM2 Ecosystem Config vs Docker Compose

**PM2 (ecosystem.config.js):**
```javascript
module.exports = {
  apps: [{
    name: 'agentsflow-ai',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/agentsflow-ai',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    }
  }]
};
```

**Docker Compose (docker-compose.prod.yml):**
```yaml
services:
  app:
    image: agentsflowai:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 1G
    restart: unless-stopped
```

### Resource Management

**PM2:**
- `max_memory_restart: '1G'` - Restart if memory exceeds 1GB
- Cluster mode with `instances: 'max'`

**Docker:**
- `memory: 1G` - Hard limit, container killed if exceeded
- `cpus: '1.0'` - CPU limit
- `restart: unless-stopped` - Automatic restart policy

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :3000
   sudo netstat -tulpn | grep :11434

   # Stop conflicting services
   sudo systemctl stop nginx  # If using port 80/443
   ```

2. **Permission Issues**
   ```bash
   # Ensure Docker socket permissions
   sudo chown deploy:docker /var/run/docker.sock

   # Check Docker group membership
   groups deploy
   ```

3. **Environment Variables**
   ```bash
   # Verify .env file exists and has correct values
   cat .env | grep -v '^#' | grep -v '^$'

   # Check container environment
   docker-compose -f docker-compose.prod.yml exec app env
   ```

4. **Database Connectivity**
   ```bash
   # Test from container
   docker-compose -f docker-compose.prod.yml exec app npx prisma db push --preview-feature

   # Check database URL
   docker-compose -f docker-compose.prod.yml exec app echo $DATABASE_URL
   ```

5. **Ollama Connection**
   ```bash
   # Test Ollama service
   docker-compose -f docker-compose.prod.yml exec ollama curl http://localhost:11434/api/tags

   # Check Ollama logs
   docker-compose -f docker-compose.prod.yml logs ollama
   ```

### Performance Tuning

1. **Memory Limits**
   ```yaml
   # Adjust based on your server capacity
   deploy:
     resources:
       limits:
         memory: 2G  # Increase if needed
         cpus: '2.0'  # Match server cores
   ```

2. **Health Checks**
   ```yaml
   # Customize timing for slower startups
   healthcheck:
     interval: 60s
     timeout: 30s
     start_period: 120s
   ```

## Maintenance Commands

### Docker Equivalents of PM2 Commands

| PM2 Command | Docker Equivalent |
|-------------|-------------------|
| `pm2 status` | `docker-compose ps` |
| `pm2 logs` | `docker-compose logs -f` |
| `pm2 monit` | `docker stats` |
| `pm2 restart all` | `docker-compose restart` |
| `pm2 reload all` | `docker-compose up -d` |
| `pm2 stop all` | `docker-compose stop` |

### Log Management

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f ollama

# Log rotation (configured in docker-compose.prod.yml)
# max-size: "10m", max-file: "3"
```

### Updates and Upgrades

```bash
# Update application
git pull origin main
docker build -t agentsflowai:latest .
docker-compose -f docker-compose.prod.yml up -d

# Update Ollama
docker-compose -f docker-compose.prod.yml pull ollama
docker-compose -f docker-compose.prod.yml up -d ollama
```

## Security Considerations

### Docker Security Best Practices

1. **Non-root containers**: Application runs as `nextjs` user (uid 1001)
2. **Read-only filesystems**: Container filesystem is read-only except for tmpfs
3. **No new privileges**: `no-new-privileges: true` security option
4. **Resource limits**: CPU and memory limits prevent resource exhaustion
5. **Minimal images**: Using Alpine Linux base images

### Additional Security Measures

```yaml
# Add to docker-compose.prod.yml
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
```

## Monitoring and Alerting

### Container Monitoring

```bash
# Container resource usage
docker stats

# Health status
docker-compose -f docker-compose.prod.yml ps
curl https://yourdomain.com/api/health

# Log aggregation
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Integration with Monitoring Tools

- **Prometheus**: Export container metrics
- **Grafana**: Dashboard for Docker metrics
- **ELK Stack**: Centralized logging
- **Uptime monitoring**: Health endpoint checks

## Support and Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js with Docker](https://nextjs.org/docs/deployment#docker-image)
- [Ollama Docker](https://github.com/jmorganca/ollama#docker)

For issues specific to AgentsFlowAI Docker deployment, check:
- Application logs: `docker-compose logs app`
- Ollama logs: `docker-compose logs ollama`
- Nginx logs: `sudo tail -f /var/log/nginx/agentsflow-ai-access.log`