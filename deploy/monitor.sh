#!/bin/bash
# ===========================================
# AgentsFlowAI - Monitoring Script
# ===========================================
# Check system and application health
# Usage: ./monitor.sh
# ===========================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="agentsflow-ai"
APP_URL="http://localhost:3000"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  AgentsFlowAI System Monitor${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# System Information
echo -e "${BLUE}📊 System Information${NC}"
echo "────────────────────────────────────────────"
echo "Hostname:     $(hostname)"
echo "OS:           $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
echo "Kernel:       $(uname -r)"
echo "Uptime:      $(uptime -p)"
echo ""

# CPU & Memory
echo -e "${BLUE}💻 CPU & Memory${NC}"
echo "────────────────────────────────────────────"
echo "CPU Usage:    $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
echo "Memory:       $(free -h | awk '/Mem:/ {printf "%s / %s (%.1f%%)", $3, $2, $3/$2 * 100}')"
echo "Swap:         $(free -h | awk '/Swap:/ {printf "%s / %s", $3, $2}')"
echo ""

# Disk Usage
echo -e "${BLUE}💾 Disk Usage${NC}"
echo "────────────────────────────────────────────"
df -h / | awk 'NR==2 {printf "Root:         %s / %s (%s used)\n", $3, $2, $5}'
echo ""

# Application Status
echo -e "${BLUE}🚀 Application Status${NC}"
echo "────────────────────────────────────────────"
if pm2 pid $APP_NAME > /dev/null 2>&1 && [ "$(pm2 pid $APP_NAME)" != "" ]; then
    echo -e "PM2 Status:   ${GREEN}Running${NC}"
    pm2 show $APP_NAME --no-color 2>/dev/null | grep -E "(status|restarts|uptime|memory|cpu)" | head -5
else
    echo -e "PM2 Status:   ${RED}Not Running${NC}"
fi
echo ""

# Health Check
echo -e "${BLUE}🏥 Health Check${NC}"
echo "────────────────────────────────────────────"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" ${APP_URL}/api/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "API Health:   ${GREEN}Healthy (HTTP 200)${NC}"
    echo "$HEALTH_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'DB Status:    {d[\"checks\"][\"database\"][\"status\"]}'); print(f'DB Latency:   {d[\"checks\"][\"database\"].get(\"latency\", \"N/A\")}ms'); print(f'Memory:       {d[\"checks\"][\"memory\"][\"used\"]}MB / {d[\"checks\"][\"memory\"][\"total\"]}MB ({d[\"checks\"][\"memory\"][\"percentage\"]}%)')" 2>/dev/null || echo "  (Could not parse health response)"
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "API Health:   ${RED}Unhealthy (HTTP 503)${NC}"
else
    echo -e "API Health:   ${RED}Unreachable${NC}"
fi
echo ""

# Service Status
echo -e "${BLUE}🔧 Services${NC}"
echo "────────────────────────────────────────────"
for service in nginx fail2ban; do
    if systemctl is-active --quiet $service 2>/dev/null; then
        echo -e "$service:\t${GREEN}Running${NC}"
    else
        echo -e "$service:\t${RED}Stopped${NC}"
    fi
done
echo ""

# Recent Errors
echo -e "${BLUE}⚠️  Recent Errors (last 10 lines)${NC}"
echo "────────────────────────────────────────────"
if [ -f /var/log/pm2/${APP_NAME}-error.log ]; then
    tail -10 /var/log/pm2/${APP_NAME}-error.log 2>/dev/null || echo "No errors found"
else
    echo "Error log not found"
fi
echo ""

# Connections
echo -e "${BLUE}🌐 Network Connections${NC}"
echo "────────────────────────────────────────────"
echo "HTTP/HTTPS:   $(ss -tuln | grep -E ':80|:443' | wc -l) listeners"
echo "Node.js:      $(ss -tuln | grep ':3000' | wc -l) listeners"
echo "Active:       $(ss -tun | grep -E ':80|:443|:3000' | wc -l) connections"
echo ""

# Fail2ban Status
echo -e "${BLUE}🛡️  Fail2ban Status${NC}"
echo "────────────────────────────────────────────"
if command -v fail2ban-client &> /dev/null; then
    sudo fail2ban-client status 2>/dev/null | grep "Jail list" || echo "Fail2ban not responding"
    BANNED=$(sudo fail2ban-client status nginx-limit-req 2>/dev/null | grep "Currently banned" | awk '{print $NF}')
    echo "Currently banned IPs: ${BANNED:-0}"
else
    echo "Fail2ban not installed"
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "  Report generated: $(date)"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
