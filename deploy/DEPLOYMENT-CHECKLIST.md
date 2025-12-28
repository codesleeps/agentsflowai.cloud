# 🚀 Production Deployment Checklist

Use this checklist to ensure a successful production deployment.

## Pre-Deployment

### 1. VPS Preparation
- [ ] VPS provisioned (Ubuntu 22.04 LTS recommended)
- [ ] Minimum specs: 2GB RAM, 1 vCPU, 25GB SSD
- [ ] Root SSH access confirmed
- [ ] DNS A record pointing to VPS IP address
- [ ] DNS propagation verified (`dig yourdomain.com`)

### 2. Local Preparation
- [ ] All tests passing locally (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No lint errors (`npm run lint`)
- [ ] `.env.production.local` prepared with real values

### 3. GitHub Secrets (for CI/CD)
- [ ] `SSH_PRIVATE_KEY` - Private key for server access
- [ ] `SSH_USER` - Username (usually `deploy`)
- [ ] `SERVER_HOST` - Server IP or domain
- [ ] `DATABASE_URL` - Production database connection string
- [ ] `CODECOV_TOKEN` (optional) - For coverage reports

---

## Server Setup (One-Time)

### Step 1: Initial Server Setup
```bash
# SSH as root
ssh root@your-server-ip

# Download and run setup script
curl -O https://raw.githubusercontent.com/yourusername/agentsflow-ai/main/deploy/setup-server.sh
chmod +x setup-server.sh

# Edit configuration at top of script
nano setup-server.sh
# Change: APP_DOMAIN, ADMIN_EMAIL

# Run setup
./setup-server.sh
```

### Step 2: SSH Key Setup
```bash
# On your LOCAL machine, generate key if needed
ssh-keygen -t ed25519 -C "deploy@agentsflow"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# On SERVER, add the key
mkdir -p /home/deploy/.ssh
echo 'paste-your-public-key-here' >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test login (new terminal)
ssh deploy@72.61.16.111
```

### Step 3: Configure Nginx
```bash
# Copy Nginx config
sudo cp /var/www/agentsflow-ai/deploy/nginx.conf /etc/nginx/sites-available/agentsflow-ai

# Edit with your domain
sudo nano /etc/nginx/sites-available/agentsflow-ai
# Replace: yourdomain.com with agentsflowai.cloud

# Enable site
sudo ln -s /etc/nginx/sites-available/agentsflow-ai /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: SSL Certificate
```bash
# Get SSL certificate
sudo certbot --nginx -d agentsflowai.cloud -d www.agentsflowai.cloud

# Verify auto-renewal
sudo certbot renew --dry-run
```

### Step 5: Configure Fail2ban
```bash
sudo cp /var/www/agentsflow-ai/deploy/fail2ban-nextjs.conf /etc/fail2ban/jail.d/
sudo cp /var/www/agentsflow-ai/deploy/fail2ban-filter-404.conf /etc/fail2ban/filter.d/nginx-404.conf
sudo systemctl restart fail2ban
```

### Step 6: Create Environment File
```bash
sudo -u deploy nano /var/www/agentsflow-ai/.env.production.local
```

Add the following:
```env
# Database
DATABASE_URL=postgres://user:password@host:5432/dbname

# Application
NODE_ENV=production
PORT=3000

# Optional: Error Monitoring
# ERROR_MONITORING_DSN=https://your-error-endpoint

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Step 7: Restart SSH (IMPORTANT)
```bash
# Only after confirming SSH key access works!
sudo systemctl restart sshd
```

---

## Deployment

### Manual Deployment
```bash
# SSH as deploy user
ssh deploy@72.61.16.111

# Navigate to app directory
cd /var/www/agentsflow-ai

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build application
npm run build

# Restart application
pm2 reload ecosystem.config.cjs --env production
```

### Automated Deployment (GitHub Actions)
1. Push to `main` branch
2. CI pipeline runs tests
3. Deploy pipeline runs automatically
4. Verify at https://agentsflowai.cloud/api/health

---

## Post-Deployment Verification

### Health Checks
- [ ] `https://yourdomain.com/api/health` returns 200
- [ ] Database status shows "up"
- [ ] Memory usage is reasonable (<80%)

### Functional Tests
- [ ] Homepage loads correctly
- [ ] Dashboard displays data
- [ ] Lead creation works
- [ ] All navigation links work

### Security Checks
- [ ] HTTPS working (no mixed content warnings)
- [ ] HTTP redirects to HTTPS
- [ ] Security headers present (check with https://securityheaders.com)

### Performance Checks
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] Images and assets loading correctly

---

## Rollback Procedure

If something goes wrong:

```bash
# SSH to server
ssh deploy@your-server-ip

# Run rollback script
cd /var/www/agentsflow-ai
./deploy/rollback.sh

# Or manually
pm2 stop all
cd /var/www/backups
ls -la  # List available backups
cp -r backup_YYYYMMDD_HHMMSS /var/www/agentsflow-ai
cd /var/www/agentsflow-ai
pm2 start ecosystem.config.cjs
```

---

## Monitoring

### PM2 Commands
```bash
pm2 status          # View process status
pm2 logs            # View logs
pm2 monit           # Real-time monitoring
pm2 restart all     # Restart all processes
```

### System Monitoring
```bash
# Run the monitoring script
./deploy/monitor.sh

# Check Nginx logs
tail -f /var/log/nginx/agentsflow-ai-access.log
tail -f /var/log/nginx/agentsflow-ai-error.log
```

---

## Troubleshooting

### Application Won't Start
```bash
pm2 logs --lines 100  # Check for errors
pm2 delete all
pm2 start ecosystem.config.cjs
```

### Database Connection Issues
```bash
# Test connection from server
psql "postgres://user:pass@host:5432/db" -c "SELECT 1"

# Check environment file
cat /var/www/agentsflow-ai/.env.production.local
```

### Nginx Issues
```bash
sudo nginx -t                    # Test config
sudo systemctl status nginx      # Check status
sudo tail -f /var/log/nginx/error.log
```

### SSL Issues
```bash
sudo certbot certificates        # List certificates
sudo certbot renew --force-renewal  # Force renewal
```

---

## Support

If you encounter issues not covered here:
1. Check application logs: `pm2 logs`
2. Check system logs: `journalctl -xe`
3. Review the README.md for architecture notes
4. Contact support with logs and error messages
