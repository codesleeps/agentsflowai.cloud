#!/bin/bash
# ===========================================
# AgentsFlowAI - Server Setup Script
# ===========================================
# This script sets up a fresh Ubuntu 22.04+ server
# Run as root or with sudo privileges
# ===========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration - EDIT THESE
APP_DOMAIN="agentsflowai.cloud"
APP_USER="deploy"
APP_DIR="/var/www/agentsflow-ai"
NODE_VERSION="20"
ADMIN_EMAIL="admin@agentsflowai.cloud"

echo "============================================="
echo " AgentsFlowAI Production Server Setup"
echo "============================================="
echo ""
echo "This script will:"
echo "  1. Create a deploy user"
echo "  2. Install Node.js ${NODE_VERSION}"
echo "  3. Install PM2"
echo "  4. Install and configure Nginx"
echo "  5. Set up SSL with Let's Encrypt"
echo "  6. Configure firewall (UFW)"
echo "  7. Set up Fail2ban"
echo "  8. Harden SSH"
echo ""
echo "Domain: ${APP_DOMAIN}"
echo "App Directory: ${APP_DIR}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# ===========================================
# 1. System Updates
# ===========================================
log_info "Updating system packages..."
apt update && apt upgrade -y
apt install -y curl git build-essential software-properties-common

# ===========================================
# 2. Create Deploy User
# ===========================================
log_info "Creating deploy user..."
if ! id "$APP_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" $APP_USER
    usermod -aG sudo $APP_USER
    echo "$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx" >> /etc/sudoers.d/$APP_USER
    chmod 440 /etc/sudoers.d/$APP_USER
    log_info "Created user: $APP_USER"
else
    log_warn "User $APP_USER already exists"
fi

# ===========================================
# 3. Install Node.js
# ===========================================
log_info "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs
log_info "Node.js version: $(node -v)"
log_info "npm version: $(npm -v)"

# ===========================================
# 4. Install PM2
# ===========================================
log_info "Installing PM2..."
npm install -g pm2
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
log_info "PM2 installed and configured for startup"

# ===========================================
# 5. Install Nginx
# ===========================================
log_info "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
log_info "Nginx installed and started"

# ===========================================
# 6. Install Certbot (Let's Encrypt)
# ===========================================
log_info "Installing Certbot..."
apt install -y certbot python3-certbot-nginx
log_info "Certbot installed"

# ===========================================
# 7. Configure Firewall (UFW)
# ===========================================
log_info "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
log_info "Firewall configured and enabled"

# ===========================================
# 8. Install Fail2ban
# ===========================================
log_info "Installing Fail2ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
log_info "Fail2ban installed and started"

# ===========================================
# 9. Create Application Directory
# ===========================================
log_info "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p /var/log/pm2
mkdir -p /var/www/certbot
chown -R $APP_USER:$APP_USER $APP_DIR
chown -R $APP_USER:$APP_USER /var/log/pm2
log_info "Application directory created: $APP_DIR"

# ===========================================
# 10. SSH Hardening
# ===========================================
log_info "Hardening SSH configuration..."
cat > /etc/ssh/sshd_config.d/hardening.conf << EOF
# SSH Hardening for AgentsFlowAI Server
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers $APP_USER
X11Forwarding no
PermitEmptyPasswords no
EOF

log_warn "SSH hardening applied. Make sure you have SSH key access before disconnecting!"
log_warn "Add your SSH key to /home/$APP_USER/.ssh/authorized_keys"

# ===========================================
# 11. Create Log Rotation
# ===========================================
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/agentsflow-ai << EOF
/var/log/pm2/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $APP_USER $APP_USER
}

/var/log/nginx/agentsflow-ai-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 \`cat /var/run/nginx.pid\`
    endscript
}
EOF

# ===========================================
# Summary
# ===========================================
echo ""
echo "============================================="
echo " Setup Complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Set up SSH key for $APP_USER:"
echo "   mkdir -p /home/$APP_USER/.ssh"
echo "   echo 'your-public-key' >> /home/$APP_USER/.ssh/authorized_keys"
echo "   chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh"
echo "   chmod 700 /home/$APP_USER/.ssh"
echo "   chmod 600 /home/$APP_USER/.ssh/authorized_keys"
echo ""
echo "2. Deploy your application to $APP_DIR"
echo ""
echo "3. Copy Nginx config:"
echo "   cp deploy/nginx.conf /etc/nginx/sites-available/agentsflow-ai"
echo "   ln -s /etc/nginx/sites-available/agentsflow-ai /etc/nginx/sites-enabled/"
echo "   rm /etc/nginx/sites-enabled/default"
echo ""
echo "4. Get SSL certificate:"
echo "   certbot --nginx -d $APP_DOMAIN -d www.$APP_DOMAIN --email $ADMIN_EMAIL"
echo ""
echo "5. Copy Fail2ban configs:"
echo "   cp deploy/fail2ban-nextjs.conf /etc/fail2ban/jail.d/"
echo "   cp deploy/fail2ban-filter-404.conf /etc/fail2ban/filter.d/nginx-404.conf"
echo "   systemctl restart fail2ban"
echo ""
echo "6. Restart SSH (IMPORTANT: ensure SSH key access first!):"
echo "   systemctl restart sshd"
echo ""
log_info "Server setup complete!"
