# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install specific pnpm version that matches our lockfile
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Stage 2: Production image
FROM node:20-alpine

# Create non-root user and set up directory permissions
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    mkdir -p /app && \
    chown -R appuser:appgroup /app

WORKDIR /app

# Install pnpm and required dependencies
RUN apk --no-cache add curl && \
    corepack enable && \
    corepack prepare pnpm@8.15.4 --activate

# Copy package files
COPY --chown=appuser:appgroup package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile && \
    # Clean cache
    pnpm store prune && \
    rm -rf /root/.npm /root/.pnpm-store /tmp/*

# Copy built application from builder
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist

# Create necessary directories and set permissions
RUN mkdir -p /app/logs && \
    chown -R appuser:appgroup /app/logs

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Expose the application port
EXPOSE 8002

# Set environment variables
ENV NODE_ENV=production \
    PORT=8002 \
    NODE_OPTIONS="--max-old-space-size=512" \
    TZ=UTC

# Command to run the application
CMD ["node", "dist/index.js"]
