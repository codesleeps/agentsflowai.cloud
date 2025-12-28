# PM2 Ecosystem Configuration

This document describes the PM2 configuration for the production server. The configuration has been updated to include the `NEXT_PUBLIC_APP_URL` environment variable to fix authentication warnings.

## Current Configuration

The `ecosystem.config.cjs` file is located in the project root and includes:

### App Configuration

- **Name:** agentsflow-ai
- **Script:** node_modules/next/dist/bin/next
- **Args:** start
- **Working Directory:** /var/www/agentsflow-ai
- **Instances:** max (uses all available CPUs)
- **Exec Mode:** cluster
- **Port:** 3005
- **Environment:** NEXT_PUBLIC_APP_URL set to "https://agentsflowai.cloud"

### Logging

- Error Log: /var/log/pm2/agentsflow-ai-error.log
- Output Log: /var/log/pm2/agentsflow-ai-out.log

### Deployment Configuration

- **Host:** srv1187860.hstgr.cloud
- **Repository:** https://github.com/codesleeps/agentsflow-ai.cloud.git
- **Branch:** origin/main

## Reload Application

After updating the configuration, reload the application to apply changes:

### Option 1: SSH into server and reload directly

```bash
ssh root@srv1187860.hstgr.cloud
cd /var/www/agentsflow-ai
pm2 reload ecosystem.config.cjs --env production
```

### Option 2: Single command (if SSH is configured)

```bash
ssh root@srv1187860.hstgr.cloud "cd /var/www/agentsflow-ai && pm2 reload ecosystem.config.cjs --env production"
```

### Verify reload

```bash
pm2 status
pm2 logs agentsflow-ai --lines 20
```

## Other Commands

```bash
# Start the application
pm2 start ecosystem.config.cjs --env production

# Stop the application
pm2 stop ecosystem.config.cjs

# Delete the application
pm2 delete ecosystem.config.cjs

# Restart the application
pm2 restart ecosystem.config.cjs --env production

# Deploy using PM2's built-in deployment system
pm2 deploy ecosystem.config.cjs production setup
pm2 deploy ecosystem.config.cjs production
```
