#!/bin/bash

# Docker Compose Validation Script
# Validates Docker Compose configuration before deployment
# Usage: ./scripts/validate-docker-compose.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESS=0

# Print functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Docker Compose Configuration Validator${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((SUCCESS++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_section() {
    echo -e "\n${BLUE}▸ $1${NC}"
}

# Validation functions

check_docker_installed() {
    print_section "Checking Docker Installation"
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,$//')
        print_success "Docker is installed (version $DOCKER_VERSION)"
    else
        print_error "Docker is not installed"
        print_info "Install from: https://docs.docker.com/get-docker/"
        return 1
    fi
}

check_docker_compose_installed() {
    print_section "Checking Docker Compose Installation"
    
    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version --short)
        print_success "Docker Compose is installed (version $COMPOSE_VERSION)"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,$//')
        print_success "Docker Compose is installed (version $COMPOSE_VERSION)"
        print_warning "Using legacy docker-compose. Consider upgrading to Docker Compose V2"
    else
        print_error "Docker Compose is not installed"
        print_info "Install from: https://docs.docker.com/compose/install/"
        return 1
    fi
}

check_docker_running() {
    print_section "Checking Docker Daemon"
    
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
        print_info "Start Docker Desktop or run: sudo systemctl start docker"
        return 1
    fi
}

check_env_file() {
    print_section "Checking Environment File"
    
    if [ -f .env ]; then
        print_success ".env file exists"
        
        # Check required variables
        REQUIRED_VARS=("DATABASE_URL" "SESSION_SECRET" "BETTER_AUTH_SECRET")
        MISSING_VARS=()
        
        for VAR in "${REQUIRED_VARS[@]}"; do
            if ! grep -q "^${VAR}=" .env || grep -q "^${VAR}=$" .env || grep -q "^${VAR}= *$" .env; then
                MISSING_VARS+=("$VAR")
            fi
        done
        
        if [ ${#MISSING_VARS[@]} -eq 0 ]; then
            print_success "All required environment variables are set"
        else
            print_error "Missing or empty required variables: ${MISSING_VARS[*]}"
            print_info "Edit .env and add values for: ${MISSING_VARS[*]}"
            return 1
        fi
        
        # Check for at least one AI provider
        AI_PROVIDERS=("OPENAI_API_KEY" "ANTHROPIC_API_KEY" "GOOGLE_API_KEY" "OPENROUTER_API_KEY")
        HAS_AI_PROVIDER=false
        
        for PROVIDER in "${AI_PROVIDERS[@]}"; do
            if grep -q "^${PROVIDER}=.\\+" .env; then
                HAS_AI_PROVIDER=true
                break
            fi
        done
        
        if [ "$HAS_AI_PROVIDER" = true ]; then
            print_success "At least one AI provider is configured"
        else
            print_warning "No AI providers configured (Ollama will be the only option)"
            print_info "Consider adding: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY"
        fi
        
    else
        print_error ".env file not found"
        print_info "Copy .env.example to .env: cp .env.example .env"
        return 1
    fi
}

check_docker_compose_files() {
    print_section "Checking Docker Compose Files"
    
    if [ -f docker-compose.yml ]; then
        print_success "docker-compose.yml exists"
        
        # Validate syntax
        if docker compose -f docker-compose.yml config &> /dev/null; then
            print_success "docker-compose.yml syntax is valid"
        else
            print_error "docker-compose.yml has syntax errors"
            print_info "Run: docker compose -f docker-compose.yml config"
            return 1
        fi
    else
        print_error "docker-compose.yml not found"
        return 1
    fi
    
    if [ -f docker-compose.dev.yml ]; then
        print_success "docker-compose.dev.yml exists"
        
        # Validate syntax with override
        if docker compose -f docker-compose.yml -f docker-compose.dev.yml config &> /dev/null; then
            print_success "docker-compose.dev.yml syntax is valid"
        else
            print_error "docker-compose.dev.yml has syntax errors"
            print_info "Run: docker compose -f docker-compose.yml -f docker-compose.dev.yml config"
            return 1
        fi
    else
        print_warning "docker-compose.dev.yml not found (optional for development)"
    fi
}

check_port_availability() {
    print_section "Checking Port Availability"
    
    PORTS=(3000 11434)
    PORT_NAMES=("Next.js App" "Ollama")
    
    for i in "${!PORTS[@]}"; do
        PORT=${PORTS[$i]}
        NAME=${PORT_NAMES[$i]}
        
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":$PORT.*LISTEN"; then
            print_warning "Port $PORT is already in use ($NAME)"
            print_info "Stop the process using port $PORT or change the port mapping in docker-compose.yml"
        else
            print_success "Port $PORT is available ($NAME)"
        fi
    done
}

check_disk_space() {
    print_section "Checking Disk Space"
    
    # Get available disk space in GB
    if command -v df &> /dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            AVAILABLE_GB=$(df -g / | awk 'NR==2 {print $4}')
        else
            # Linux
            AVAILABLE_GB=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
        fi
        
        REQUIRED_GB=20
        
        if [ "$AVAILABLE_GB" -ge "$REQUIRED_GB" ]; then
            print_success "Sufficient disk space available (${AVAILABLE_GB}GB available, ${REQUIRED_GB}GB required)"
        else
            print_warning "Low disk space (${AVAILABLE_GB}GB available, ${REQUIRED_GB}GB recommended)"
            print_info "Ollama models can use 15-20GB. Consider freeing up space."
        fi
    else
        print_warning "Cannot check disk space (df command not available)"
    fi
}

check_docker_resources() {
    print_section "Checking Docker Resources"
    
    if docker info &> /dev/null; then
        # Get total memory (different format on different systems)
        TOTAL_MEM=$(docker info --format '{{.MemTotal}}' 2>/dev/null | awk '{print int($1/1024/1024/1024)}')
        
        if [ -n "$TOTAL_MEM" ] && [ "$TOTAL_MEM" -ge 16 ]; then
            print_success "Docker has sufficient memory allocated (${TOTAL_MEM}GB)"
        elif [ -n "$TOTAL_MEM" ]; then
            print_warning "Docker memory allocation is low (${TOTAL_MEM}GB, 16GB recommended)"
            print_info "Increase Docker Desktop memory: Preferences → Resources → Memory"
        else
            print_info "Unable to determine Docker memory allocation"
        fi
    fi
}

check_dockerfile() {
    print_section "Checking Dockerfile"
    
    if [ -f Dockerfile ]; then
        print_success "Dockerfile exists"
        
        # Check for common issues
        if grep -q "COPY \\.env" Dockerfile; then
            print_error "Dockerfile copies .env file (security risk)"
            print_info "Remove COPY .env from Dockerfile. Use --env-file or -e flags instead."
        else
            print_success "Dockerfile does not copy .env file"
        fi
        
        if grep -q "^FROM.*:latest" Dockerfile; then
            print_warning "Dockerfile uses :latest tag (not recommended for production)"
            print_info "Pin specific versions for reproducible builds"
        fi
        
    else
        print_error "Dockerfile not found"
        return 1
    fi
}

check_node_version() {
    print_section "Checking Node.js Version"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | sed 's/v//' | cut -d'.' -f1)
        REQUIRED_VERSION=20
        
        if [ "$NODE_VERSION" -ge "$REQUIRED_VERSION" ]; then
            print_success "Node.js version is compatible (v$(node --version | sed 's/v//'))"
        else
            print_warning "Node.js version is below recommended (v$(node --version | sed 's/v//'), v${REQUIRED_VERSION}.x recommended)"
            print_info "Upgrade Node.js from: https://nodejs.org/"
        fi
    else
        print_warning "Node.js is not installed (required for npm scripts)"
        print_info "Install from: https://nodejs.org/"
    fi
}

check_project_structure() {
    print_section "Checking Project Structure"
    
    REQUIRED_DIRS=("src" "prisma" "public")
    
    for DIR in "${REQUIRED_DIRS[@]}"; do
        if [ -d "$DIR" ]; then
            print_success "Directory exists: $DIR"
        else
            print_warning "Directory not found: $DIR"
        fi
    done
}

print_summary() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Validation Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${GREEN}✓ Passed:${NC}   $SUCCESS"
    echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
    echo -e "${RED}✗ Errors:${NC}   $ERRORS"
    
    echo ""
    
    if [ $ERRORS -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}\n"
            print_info "Start services with: docker-compose up -d"
            print_info "Or for development: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up"
        else
            echo -e "${YELLOW}⚠ Validation passed with warnings.${NC}\n"
            print_info "Review warnings above before deploying."
            print_info "Start services with: docker-compose up -d"
        fi
        return 0
    else
        echo -e "${RED}✗ Validation failed. Please fix errors before deploying.${NC}\n"
        print_info "Review errors above and run this script again."
        return 1
    fi
}

# Main execution
main() {
    print_header
    
    # Run all checks
    check_docker_installed || true
    check_docker_compose_installed || true
    check_docker_running || true
    check_node_version || true
    check_docker_resources || true
    check_env_file || true
    check_docker_compose_files || true
    check_dockerfile || true
    check_port_availability || true
    check_disk_space || true
    check_project_structure || true
    
    # Print summary and exit with appropriate code
    print_summary
    exit $?
}

# Run main function
main
