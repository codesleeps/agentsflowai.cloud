# Automatic Deployment Setup Guide

This guide explains how to set up automatic deployments for agentsflow-ai.cloud.

## Your Server Details

- **Host**: `srv1187860.hstgr.cloud`
- **IP**: `72.61.16.111`
- **User**: `root`
- **App Path**: `/var/www/agentsflow-ai`
- **Port**: `3005`
- **URL**: `http://72.61.16.111:3005`

---

## ✅ Deployment Status

| Component    | Status                   |
| ------------ | ------------------------ |
| SSH Access   | ✅ Connected             |
| App Files    | ✅ Synced                |
| PM2 Process  | ✅ Running (4 instances) |
| App Response | ✅ HTTP 200              |

---

## How to Deploy

### From Your Local Machine (MacBook)

Run the deploy script from your local machine:

```bash
bash deploy/deploy.sh
```

This will:

1. Build the project locally
2. Sync files to the server via rsync
3. Install dependencies on the server
4. Run database migrations
5. Restart PM2

### From the Server

If you've already built locally and just want to sync and restart:

```bash
# SSH to server
ssh -i ~/.ssh/deploy_key root@srv1187860.hstgr.cloud

# Sync from local (run this from your MacBook terminal):
rsync -avz -e "ssh -i ~/.ssh/deploy_key" /Users/test/Desktop/agentsflowai.cloud/ root@srv1187860.hstgr.cloud:/var/www/agentsflow-ai/

# On server, restart PM2
pm2 restart agentsflow-ai
```

---

## Quick Commands

### SSH to Server

```bash
ssh -i ~/.ssh/deploy_key root@srv1187860.hstgr.cloud
```

### Check App Status

```bash
pm2 status
pm2 logs agentsflow-ai --lines 50
```

### Restart App

```bash
pm2 restart agentsflow-ai
```

---

## PM2 Cluster Mode

The app runs in cluster mode with 4 instances for better performance:

```
┌────┬──────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┐
│ id │ name             │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │
├────┼──────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┤
│ 0  │ agentsflow-ai    │ default     │ 15.4.10 │ cluster │ 115582   │ 5m     │ 0    │ online    │ 0%       │
│ 1  │ agentsflow-ai    │ default     │ 15.4.10 │ cluster │ 115589   │ 5m     │ 0    │ online    │ 0%       │
│ 2  │ agentsflow-ai    │ default     │ 15.4.10 │ cluster │ 115596   │ 5m     │ 0    │ online    │ 0%       │
│ 3  │ agentsflow-ai    │ default     │ 15.4.10 │ cluster │ 115603   │ 5m     │ 0    │ online    │ 0%       │
└────┴──────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┘
```

---

## Rollback If Needed

```bash
# View previous deployments
pm2 list

# Restore previous version
pm2 resurrect
```

---

## Files Modified

- `deploy/deploy.sh` - Deployment script (run from local machine)
- `ecosystem.config.cjs` - PM2 configuration
- `deploy/AUTO-DEPLOYMENT.md` - This documentation

---

## Next Steps

To make this fully automatic (GitHub push → deploy), you would:

1. Push the code to a GitHub repository
2. Configure GitHub Actions with SSH access to the server
3. Set up a webhook for automatic triggers
