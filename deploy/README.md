# Deployment Configuration Files

This folder contains all the configuration files and scripts needed to deploy AgentsFlowAI to a production server.

## Files Overview

| File | Description | Destination |
|------|-------------|-------------|
| `nginx.conf` | Nginx reverse proxy with SSL, security headers, rate limiting | `/etc/nginx/sites-available/agentsflow-ai` |
| `fail2ban-nextjs.conf` | Fail2ban jail configuration for rate limit and bad bots | `/etc/fail2ban/jail.d/agentsflow-ai.conf` |
| `fail2ban-filter-404.conf` | Fail2ban filter for 404 scanners | `/etc/fail2ban/filter.d/nginx-404.conf` |
| `setup-server.sh` | Initial server setup (run once on fresh server) | Run from repository |
| `deploy.sh` | Deployment automation script | Run from app directory |
| `rollback.sh` | Rollback to previous version | Run from app directory |
| `monitor.sh` | System and application monitoring | Run from app directory |

## Quick Commands

```bash
# Initial server setup (as root)
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh

# Deploy updates (as deploy user)
./deploy/deploy.sh main

# Rollback to previous version
./deploy/rollback.sh backup-20241221-120000.tar.gz

# Monitor system health
./deploy/monitor.sh
```

## Configuration Customization

Before deploying, edit the following in each file:

1. **nginx.conf**: Replace `yourdomain.com` with your actual domain
2. **fail2ban-nextjs.conf**: Replace `admin@yourdomain.com` with your email
3. **setup-server.sh**: Edit the configuration section at the top:
   - `APP_DOMAIN`
   - `APP_USER`
   - `APP_DIR`
   - `ADMIN_EMAIL`

## Security Features

- ✅ HTTPS with modern TLS configuration
- ✅ HTTP to HTTPS redirect
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Rate limiting on API routes
- ✅ Fail2ban for brute-force protection
- ✅ SSH hardening (key-only auth, no root login)
- ✅ UFW firewall
- ✅ Log rotation

## Monitoring

The application exposes a health endpoint at `/api/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-12-21T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "up", "latency": 5 },
    "memory": { "status": "ok", "used": 128, "total": 512, "percentage": 25 }
  }
}
```

Use this endpoint for:
- Load balancer health checks
- External monitoring services (UptimeRobot, Pingdom, etc.)
- Internal alerting systems
