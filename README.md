# AgentsFlowAI - AI-Powered Business Automation Platform

## High-level Strategy and Goal

AgentsFlowAI is an AI-powered business automation platform designed to transform business operations with intelligent automation. The platform combines multiple AI agents to handle:

- **Customer Interactions** - 24/7 AI-powered chat support
- **Lead Qualification** - Automatic scoring and prioritization
- **Service Recommendations** - Intelligent package suggestions
- **Business Analytics** - Real-time performance metrics
- **Appointment Scheduling** - Automated calendar management

### Target Users
- Digital marketing agencies
- Consulting firms
- SaaS companies
- E-commerce businesses
- Professional services firms
- Startups wanting to scale without hiring

### Key Value Propositions
- 80% reduction in manual lead qualification time
- 3x faster response time (instant vs 4-8 hours)
- 40% increase in qualified leads
- 24/7 availability

---

## Changes Implemented

### Initial Build (December 2024)

1. **Database Schema**
   - Created `services` table for service packages
   - Created `leads` table for lead management with AI scoring
   - Created `conversations` table for chat tracking
   - Created `messages` table for conversation history
   - Created `appointments` table for scheduling
   - Created `analytics_events` table for tracking
   - Seeded sample services (Starter $999, Growth $2499, Enterprise $4999)
   - Seeded sample leads for demonstration

2. **API Endpoints**
   - `GET/POST /api/leads` - Lead CRUD operations
   - `GET/PATCH/DELETE /api/leads/[id]` - Individual lead management
   - `GET/POST /api/services` - Service management
   - `GET /api/dashboard/stats` - Dashboard statistics
   - `GET/POST /api/conversations` - Conversation management
   - `GET/POST /api/conversations/[id]/messages` - Message management
   - `GET/POST /api/appointments` - Appointment scheduling

3. **Dashboard Pages** (Route Group: `(dashboard)`)
   - **Dashboard** (`/`) - Main dashboard with KPIs, AI agent status, lead pipeline, recent leads
   - **AI Chat** (`/chat`) - AI-powered chat agent with service recommendations
   - **Leads** (`/leads`) - Lead management with filtering, status updates, and AI qualification
   - **New Lead** (`/leads/new`) - Create leads with AI-powered qualification
   - **Services** (`/services`) - Service package management with comparison table
   - **Analytics** (`/analytics`) - Business analytics with charts and AI performance metrics
   - **Appointments** (`/appointments`) - Appointment scheduling and management

4. **Marketing Website** (`/welcome`)
   - Beautiful landing page with hero section
   - Features showcase section
   - How it works explanation
   - Use cases for different industries
   - Pricing section with 3 tiers
   - Customer testimonials
   - Contact form
   - Full navigation with smooth scrolling
   - Responsive mobile menu
   - Footer with links

5. **AI Integration**
   - AI Chat Agent using built-in OpenAI integration
   - AI Lead Qualification generating scores, budget estimates, and recommendations
   - Context-aware responses with service knowledge

6. **Local AI with Ollama**
   - **Benefits**: Free, private, no API limits, offline capability
   - **Quick Start**: Install Ollama → Pull models → Configure environment
   - **Setup Guide**: See `docs/OLLAMA_SETUP.md` for complete instructions
   - **Models**: `mistral:7b`, `llama3.1:8b`, `gemma2:9b` for different use cases

   ### Ollama vs Cloud Providers

   | Feature | Ollama | Cloud AI (OpenAI/Google) |
   |---------|--------|---------------------------|
   | **Cost** | Free after setup | Pay per token/request |
   | **Privacy** | 100% local | Data sent to providers |
   | **Speed** | Fast (local inference) | Variable (network latency) |
   | **Availability** | Always available | Rate limits, outages |
   | **Setup** | One-time model download | API key configuration |
   | **Offline** | ✅ Works offline | ❌ Requires internet |

   ### Recommended Models by Use Case

   | Use Case | Recommended Model | Size | Why |
   |----------|-------------------|------|-----|
   | **Fast Chat** | `mistral:7b` | 3.8GB | Fast responses, general purpose |
   | **Code/Web Dev** | `llama3.1:8b` | 4.7GB | Better reasoning, technical tasks |
   | **Content Creation** | `gemma2:9b` | 5.4GB | Creative writing, analysis |

6. **UI/UX**
   - Clean, modern design with consistent styling
   - Responsive layout for all screen sizes
   - Real-time data updates using SWR
   - Toast notifications for user feedback
   - Sidebar navigation with active state highlighting
   - Separate layouts for dashboard (with sidebar) and marketing website (full width)

7. **AI Agents Enhancements (December 2025)**
   - Dedicated SEO Agent page (`/ai-agents/seo`) for keyword research, meta tags, and content audits
   - Dedicated Content Creation Agent page (`/ai-agents/content`) for blog, email, social, and ad copy
   - Dedicated Social Media Agent page (`/ai-agents/social`) with Single Post, Campaign, and Ad Copy tools, each with a large editable output area and copy-to-clipboard
   - Quick links to specialized agents from the AI Agents Hub

8. **Marketing Hub Enhancements (February 2026)**
   - **URL Research** - Research content from any URL with AI-powered analysis
   - **Content Repurposer** - Turn one piece of content into multiple platform formats (LinkedIn, Twitter, Instagram, Facebook, Email, Blog)
   - **Template Library** - 6 pre-built campaign templates (Product Launch, Weekly Newsletter, Case Study, Thought Leadership, Webinar Promotion, Holiday Special)
   - **Viral Analyzer** - AI-powered content optimization with viral score, engagement metrics, and improvement suggestions
   - **Content Calendar** - Visual scheduling with monthly/weekly views, post statistics, and platform-specific organization
   - **Campaign Wizard** - Step-by-step guided campaign creation for non-technical users
   - URL input support in Content Repurposer for fetching and repurposing external content
   - Integration between URL Research and Campaign Wizard for seamless workflow

### Production Ready Updates (December 2025)

9. **Unit Testing Suite**
   - Comprehensive tests for all API routes (leads, services, appointments, conversations, health, dashboard)
   - Utility function tests with edge case coverage
   - Error monitoring library tests
   - Test files organized in `__tests__` directories
   - Mock patterns for database queries
   - Target: 90% coverage on critical paths

10. **Error Monitoring System**
   - Custom lightweight error monitoring library (`/lib/error-monitoring.ts`)
   - Breadcrumb tracking for debugging
   - User context and session tracking
   - Global error handlers (browser & Node.js)
   - Can integrate with external services (Sentry, etc.)
   - React ErrorBoundary component

11. **CI/CD Pipeline (GitHub Actions)**
    - `.github/workflows/ci.yml` - Lint, type check, test, build
    - `.github/workflows/deploy.yml` - Automated production deployment
    - Codecov integration for coverage reports
    - Zero-downtime deployment with rollback support

12. **Enhanced Server Setup**
    - Complete `deploy/setup-server.sh` script
    - `deploy/DEPLOYMENT-CHECKLIST.md` with step-by-step guide
    - PM2 ecosystem configuration
    - Nginx configuration with security headers
    - Fail2ban protection
    - SSH hardening

---

## Architecture and Technical Decisions

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI components
- **State Management**: SWR for data fetching and caching
- **Database**: PostgreSQL (Neon)
- **AI**: Built-in OpenAI integration via `generateText` and `generateObject`
- **Charts**: Recharts with Shadcn chart components

### Route Structure
```
/welcome          - Public marketing landing page (no sidebar)
/                 - Dashboard (with sidebar)
/chat             - AI Chat Agent (with sidebar)
/leads            - Lead Management (with sidebar)
/leads/new        - Add New Lead (with sidebar)
/services         - Service Packages (with sidebar)
/analytics        - Business Analytics (with sidebar)
/appointments     - Appointments (with sidebar)
/marketing        - Marketing Hub with 6 tools (with sidebar)
  ├── Campaigns   - Manage AI-powered marketing campaigns
  ├── Research    - URL content research and analysis
  ├── Repurposer  - Content repurposing across platforms
  ├── Templates   - Pre-built campaign templates
  ├── Analyzer    - Viral content optimization
  └── Calendar    - Content scheduling and planning
/ai-agents        - AI Agents Hub (with sidebar)
  ├── /seo        - SEO Agent for keyword research
  ├── /content    - Content Creation Agent
  └── /social     - Social Media Agent
```

### Database Design Rationale
- **UUID primary keys**: Better for distributed systems and security
- **JSONB fields**: Flexible storage for features array and metadata
- **Soft references**: Using lead_id foreign keys for relationships
- **Timestamps**: Automatic created_at/updated_at for auditing

### API Design
- RESTful endpoints following Next.js App Router conventions
- Query parameters for filtering (status, source, leadId)
- Type assertions with `as unknown as Type[]` pattern for queryInternalDatabase results
- Proper error handling with descriptive messages

### AI Integration Strategy
- System prompt contains full service catalog for accurate recommendations
- Conversation history passed to AI for context-aware responses
- Lead qualification uses structured output via `generateObject`
- Graceful fallback for AI errors

### State Management
- SWR for server state with automatic revalidation
- `mutate` calls after mutations to refresh related data
- Dashboard stats refresh every 30 seconds

### Layout Strategy
- Root layout provides ThemeProvider and Toaster
- Dashboard route group `(dashboard)` adds sidebar wrapper
- Welcome page has its own layout without sidebar

### MCP Integration (Model Context Protocol)

The platform includes MCP (Model Context Protocol) integration for enhanced AI capabilities:

- **MCP-Fetch** - Web content fetching for research tasks
- **MCP-Context7** - Documentation and knowledge base access
- **MCP-Playwright** - Browser automation for web tasks

See `docs/MCP_INTEGRATION_GUIDE.md` for setup instructions.

### Future Considerations
- WebSocket integration for real-time chat
- Email integration for automated follow-ups
- Calendar integration (Google Calendar, Outlook)
- CRM integration (HubSpot, Salesforce)
- Multi-tenant support for agencies
- Advanced URL content extraction with Puppeteer/Playwright
- Social media API integrations for direct publishing

---

## Production Deployment Guide

This section provides complete instructions for deploying AgentsFlowAI to a production server.

### Prerequisites

- **Server**: Ubuntu 22.04+ (VPS from DigitalOcean, AWS EC2, Linode, etc.)
- **Domain**: A domain name pointed to your server's IP address
- **SSH Access**: Root or sudo access to the server

### Quick Start

```bash
# 1. SSH into your server as root
ssh root@your-server-ip

# 2. Clone this repository
git clone https://github.com/your-repo/agentsflow-ai.git /tmp/agentsflow-setup
cd /tmp/agentsflow-setup

# 3. Run the server setup script
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh

# 4. Follow the post-setup instructions printed by the script
```

### Detailed Setup Steps

#### Step 1: Server Preparation

```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y curl git build-essential
```

#### Step 2: Create Deploy User

```bash
# Create user
adduser --disabled-password deploy
usermod -aG sudo deploy

# Set up SSH key authentication
mkdir -p /home/deploy/.ssh
echo "your-ssh-public-key" >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

#### Step 3: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # Should show v20.x.x
```

#### Step 4: Install PM2

```bash
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy
```

#### Step 5: Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

#### Step 6: Configure Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

#### Step 7: Install SSL (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Step 8: Deploy Application

```bash
# As deploy user
su - deploy

# Clone repository
git clone https://github.com/your-repo/agentsflow-ai.git /var/www/agentsflow-ai
cd /var/www/agentsflow-ai

# Install dependencies
npm ci

# Create production environment file
cp .env.example .env.production.local
nano .env.production.local  # Edit with your values

# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

#### Step 9: Configure Nginx

```bash
# Copy config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/agentsflow-ai

# Edit domain name
sudo nano /etc/nginx/sites-available/agentsflow-ai
# Replace yourdomain.com with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/agentsflow-ai /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 10: Set Up Fail2ban

```bash
sudo cp deploy/fail2ban-nextjs.conf /etc/fail2ban/jail.d/agentsflow-ai.conf
sudo cp deploy/fail2ban-filter-404.conf /etc/fail2ban/filter.d/nginx-404.conf
sudo systemctl restart fail2ban
```

#### Step 11: Harden SSH

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config.d/hardening.conf

# Add:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers deploy

# IMPORTANT: Test SSH access in new terminal before restarting!
sudo systemctl restart sshd
```

### Deployment Workflow

After initial setup, deploy updates using:

```bash
cd /var/www/agentsflow-ai
./deploy/deploy.sh main  # Deploy from main branch
```

### Rollback

If something goes wrong:

```bash
cd /var/www/agentsflow-ai
./deploy/rollback.sh  # List available backups
./deploy/rollback.sh backup-20241221-120000.tar.gz  # Rollback to specific backup
```

### Health Monitoring

The app exposes a health endpoint at `/api/health`:

```bash
curl https://yourdomain.com/api/health
```

Response:
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

### Useful PM2 Commands

```bash
pm2 status                    # View running processes
pm2 logs agentsflow-ai        # View logs
pm2 monit                     # Real-time monitoring
pm2 reload ecosystem.config.js --env production  # Zero-downtime restart
pm2 stop agentsflow-ai        # Stop app
pm2 delete agentsflow-ai      # Remove from PM2
```

### SSL Certificate Renewal

Certbot auto-renews certificates. Test with:

```bash
sudo certbot renew --dry-run
```

### Security Checklist

- [x] SSH key-only authentication
- [x] Root login disabled
- [x] Firewall enabled (UFW)
- [x] SSL/HTTPS enabled
- [x] Rate limiting on API routes
- [x] Fail2ban for brute-force protection
- [x] Security headers configured
- [x] Log rotation configured

### Configuration Files

| File | Description |
|------|-------------|
| `ecosystem.config.js` | PM2 process configuration |
| `deploy/nginx.conf` | Nginx reverse proxy config |
| `deploy/fail2ban-nextjs.conf` | Fail2ban jail configuration |
| `deploy/setup-server.sh` | Initial server setup script |
| `deploy/deploy.sh` | Deployment automation script |
| `deploy/rollback.sh` | Rollback to previous version |

### Environment Variables

Create `.env.production.local` with:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
NEXT_PUBLIC_APP_URL=https://yourdomain.com
OPENAI_API_KEY=sk-your-key
SESSION_SECRET=generate-with-openssl-rand-base64-32
```

---

## Docker Deployment (Recommended)

For production deployment, we recommend using Docker containers for better isolation, scalability, and maintainability.

### Docker Prerequisites

- **Server**: Ubuntu 22.04+ with Docker and Docker Compose installed
- **Domain**: A domain name pointed to your server's IP address
- **SSH Access**: Root or sudo access to the server

### Docker Quick Start

```bash
# 1. SSH into your server as root
ssh root@your-server-ip

# 2. Clone this repository
git clone https://github.com/your-repo/agentsflow-ai.git /tmp/agentsflow-setup
cd /tmp/agentsflow-setup

# 3. Run the server setup script (includes Docker installation)
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh

# 4. Follow the post-setup instructions
```

### Docker Deployment Steps

#### Step 1: Server Setup with Docker

The `deploy/setup-server.sh` script now includes Docker installation. It will:
- Install Docker and Docker Compose
- Add deploy user to docker group
- Set up all necessary services (Nginx, SSL, firewall, etc.)

#### Step 2: Configure Environment

```bash
# As deploy user
su - deploy
cd /home/deploy/agentsflow-ai

# Create environment file
cp .env.production.template .env
nano .env  # Edit with your production values
```

#### Step 3: Deploy with Docker

```bash
# Run the Docker deployment script
./deploy/docker-deploy.sh
```

This script will:
- Build the Docker image locally
- Transfer it to the server
- Run database migrations
- Start containers with docker-compose

#### Step 4: Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl https://yourdomain.com/api/health
```

### Docker Architecture

AgentsFlowAI uses a multi-container setup:

- **app**: Next.js application (port 3000)
- **ollama**: Local AI models (port 11434)
- **nginx**: Reverse proxy and SSL termination
- **postgres** (optional): PostgreSQL database

### Docker Commands

```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f ollama

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Stop all services
docker-compose -f docker-compose.prod.yml down
```

### Docker Environment Variables

Create `.env` with:

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
```

### Docker Migration from PM2

If migrating from PM2 to Docker:

1. **Backup current deployment**
2. **Stop PM2 services**: `pm2 stop all && pm2 delete all`
3. **Deploy with Docker**: `./deploy/docker-deploy.sh`
4. **Update Nginx upstream** to point to Docker container (port 3000)
5. **Test thoroughly** before removing PM2

See `deploy/DOCKER-MIGRATION.md` for detailed migration guide.

### Docker Security Features

- **Non-root containers**: Application runs as unprivileged user
- **Resource limits**: CPU and memory constraints prevent abuse
- **Read-only filesystems**: Enhanced security with tmpfs mounts
- **Security options**: `no-new-privileges` and capability restrictions
- **Isolated networks**: Services communicate through defined networks

### Docker Monitoring

```bash
# Container resource usage
docker stats

# Health checks
docker-compose -f docker-compose.prod.yml ps
curl https://yourdomain.com/api/health

# Log aggregation
docker-compose -f docker-compose.prod.yml logs --tail=100 -f
```

### Docker Troubleshooting

**Container won't start:**
```bash
docker-compose -f docker-compose.prod.yml logs app
```

**Database connection issues:**
```bash
docker-compose -f docker-compose.prod.yml exec app npx prisma db push
```

**Permission issues:**
```bash
sudo usermod -aG docker deploy
newgrp docker
```

**Port conflicts:**
```bash
sudo netstat -tulpn | grep :3000
docker-compose -f docker-compose.prod.yml down
```

For detailed Docker setup and troubleshooting, see `docs/DOCKER_SETUP.md`.
