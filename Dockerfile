# ==============================================================================
# Stage 1: Dependencies
# Purpose: Install all dependencies needed for build and production
# ==============================================================================
FROM node:20-alpine AS dependencies

# Install libc6-compat for Next.js compatibility on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency installation
# Copying these first enables Docker layer caching - dependencies only reinstall if package files change
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# ==============================================================================
# Stage 2: Builder
# Purpose: Build the Next.js application with Prisma client generation
# ==============================================================================
FROM node:20-alpine AS builder

# Install libc6-compat for Next.js compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code (filtered by .dockerignore)
COPY . .

# Generate Prisma Client
# This must happen before the Next.js build since the app imports @prisma/client
RUN npx prisma generate

# Set NODE_ENV to production for optimized build
ENV NODE_ENV=production

# Build Next.js application
# With output: 'standalone' in next.config.js, this creates a minimal .next/standalone directory
# that includes only the dependencies needed to run the production server
RUN npm run build

# ==============================================================================
# Stage 3: Runner (Production)
# Purpose: Minimal production image with only runtime dependencies
# ==============================================================================
FROM node:20-alpine AS runner

# Install runtime dependencies
# - libc6-compat: Required for Next.js on Alpine
# - dumb-init: Proper signal handling for PID 1 in containers (graceful shutdowns)
# - curl: Health check support
# - netcat-openbsd: Redis connectivity checks in entrypoint
RUN apk add --no-cache libc6-compat dumb-init curl netcat-openbsd

WORKDIR /app

# Create non-root user for security
# Running as non-root is a security best practice that limits potential damage from compromises
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone output from builder
# Next.js standalone output includes the minimal set of files needed to run the server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files
# These are not included in standalone output and must be copied separately
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public directory for static assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema
# Prisma Client needs the schema at runtime for certain operations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy scripts directory
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy entrypoint script
COPY --from=builder --chown=root:root /app/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Make entrypoint executable
RUN chmod +x /app/docker-entrypoint.sh

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Health check configuration
# Uses the existing /api/health endpoint to verify application is running
# - interval: Check every 30 seconds
# - timeout: Fail check if it takes longer than 10 seconds
# - start-period: Wait 40 seconds before first check (allows app to initialize)
# - retries: Mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use custom entrypoint for graceful shutdown and model warmup
ENTRYPOINT ["/app/docker-entrypoint.sh"]
