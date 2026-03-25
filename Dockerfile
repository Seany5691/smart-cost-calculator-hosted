# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install Playwright system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm

# Create non-root user first
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/database ./database
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/run-scraper-migrations.js ./run-scraper-migrations.js
COPY --from=builder /app/run-scraper-migrations.sh ./run-scraper-migrations.sh

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to nextjs user to install Playwright browsers
USER nextjs

# Install Playwright browsers as nextjs user
RUN npx playwright@1.48.0 install chromium

# Create a larger /tmp/shm directory for Chromium (switch back to root temporarily)
USER root
RUN mkdir -p /tmp/shm && chmod 1777 /tmp/shm

# Switch back to nextjs user
USER nextjs

EXPOSE ${APP_INTERNAL_PORT:-3456}

ENV PORT ${APP_INTERNAL_PORT:-3456}
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3456) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
